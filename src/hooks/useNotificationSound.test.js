import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useNotificationSound from './useNotificationSound';

function createAudioMock() {
  return {
    currentTime: 12,
    volume: 1,
    preload: '',
    pause: vi.fn(),
    play: vi.fn(() => Promise.resolve()),
  };
}

describe('useNotificationSound', () => {
  let storage;

  beforeEach(() => {
    storage = new Map();
    vi.clearAllMocks();
    localStorage.getItem.mockImplementation((key) => storage.get(key) ?? null);
    localStorage.setItem.mockImplementation((key, value) => storage.set(key, value));
    localStorage.removeItem.mockImplementation((key) => storage.delete(key));
    localStorage.clear.mockImplementation(() => storage.clear());
  });

  it('plays the custom MP3 from the beginning at the selected volume', async () => {
    const audio = createAudioMock();
    globalThis.Audio = class AudioMock {
      constructor(src) {
        audio.src = src;
        return audio;
      }
    };
    const { result, unmount } = renderHook(() => useNotificationSound());

    await act(async () => {
      expect(await result.current.playNotificationSound()).toBe(true);
    });

    expect(audio.src).toBe('/sounds/notification.mp3');
    expect(audio.preload).toBe('auto');
    expect(audio.currentTime).toBe(0);
    expect(audio.volume).toBe(0.55);
    expect(audio.play).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('persists mute and does not play audio while muted', async () => {
    const audio = createAudioMock();
    globalThis.Audio = class AudioMock {
      constructor() { return audio; }
    };
    const { result, unmount } = renderHook(() => useNotificationSound());

    act(() => result.current.toggleNotificationSound());
    await act(async () => {
      expect(await result.current.playNotificationSound()).toBe(false);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'structora_notification_sound_enabled',
      'false'
    );
    expect(audio.play).not.toHaveBeenCalled();
    unmount();
  });

  it('suppresses duplicate chimes from another tab in the same burst', async () => {
    const audio = createAudioMock();
    globalThis.Audio = class AudioMock {
      constructor() { return audio; }
    };
    const { result, unmount } = renderHook(() => useNotificationSound());

    await act(async () => {
      expect(await result.current.playNotificationSound()).toBe(true);
      expect(await result.current.playNotificationSound()).toBe(false);
    });

    expect(audio.play).toHaveBeenCalledTimes(1);
    unmount();
  });
});
