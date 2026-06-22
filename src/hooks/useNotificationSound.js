import { useCallback, useEffect, useRef, useState } from 'react';

const ENABLED_KEY = 'structora_notification_sound_enabled';
const VOLUME_KEY = 'structora_notification_sound_volume';
const PLAY_LOCK_KEY = 'structora_notification_sound_last_played';
const PLAY_LOCK_MS = 1500;

const clampVolume = (value) => Math.min(1, Math.max(0, Number(value) || 0));

function getStoredVolume() {
  return clampVolume(localStorage.getItem(VOLUME_KEY) ?? 0.55);
}

export default function useNotificationSound() {
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem(ENABLED_KEY) !== 'false'
  );
  const [soundVolume, setSoundVolumeState] = useState(getStoredVolume);
  const audioRef = useRef(null);

  // Browsers require an interaction before audible playback. Login usually
  // satisfies this, while these listeners cover restored sessions/new tabs.
  useEffect(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}sounds/notification.mp3`);
    audio.preload = 'auto';
    audioRef.current = audio;

    const unlock = () => {
      const previousVolume = audio.volume;
      audio.volume = 0;
      try {
        Promise.resolve(audio.play())
          .then(() => {
            audio.pause();
            audio.currentTime = 0;
          })
          .catch(() => {})
          .finally(() => {
            audio.volume = previousVolume;
          });
      } catch {
        audio.volume = previousVolume;
      }
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const playNotificationSound = useCallback(async () => {
    if (!soundEnabled || soundVolume === 0) return false;
    const audio = audioRef.current;
    if (!audio) return false;

    // Only one Structora tab should chime for the same notification burst.
    const now = Date.now();
    const lastPlayed = Number(localStorage.getItem(PLAY_LOCK_KEY) || 0);
    if (now - lastPlayed < PLAY_LOCK_MS) return false;
    localStorage.setItem(PLAY_LOCK_KEY, String(now));

    try {
      audio.pause();
      audio.currentTime = 0;
      audio.volume = soundVolume;
      await audio.play();

      return true;
    } catch {
      if (localStorage.getItem(PLAY_LOCK_KEY) === String(now)) {
        localStorage.removeItem(PLAY_LOCK_KEY);
      }
      // Autoplay denial and unsupported audio must never interrupt notifications.
      return false;
    }
  }, [soundEnabled, soundVolume]);

  const toggleNotificationSound = useCallback(() => {
    setSoundEnabled((current) => {
      const next = !current;
      localStorage.setItem(ENABLED_KEY, String(next));
      return next;
    });
  }, []);

  const setNotificationVolume = useCallback((value) => {
    const next = clampVolume(value);
    localStorage.setItem(VOLUME_KEY, String(next));
    setSoundVolumeState(next);
  }, []);

  return {
    soundEnabled,
    soundVolume,
    playNotificationSound,
    toggleNotificationSound,
    setNotificationVolume,
  };
}
