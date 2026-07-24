import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { NotificationProvider, useNotifications } from './NotificationContext';

const mocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  playSound: vi.fn(),
}));

vi.mock('./AuthContext', () => ({
  useAuth: () => ({ user: { id: 7 } }),
}));

vi.mock('../services/notifications', () => ({
  notificationApi: {
    getAll: mocks.getAll,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    delete: vi.fn(),
    clearAll: vi.fn(),
  },
}));

vi.mock('../hooks/useNotificationSound', () => ({
  default: () => ({
    soundEnabled: true,
    soundVolume: 0.55,
    playNotificationSound: mocks.playSound,
    toggleNotificationSound: vi.fn(),
    setNotificationVolume: vi.fn(),
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en' } }),
}));

vi.mock('@mui/material', () => ({
  Snackbar: ({ open, children }) => open ? <div>{children}</div> : null,
  Alert: ({ children }) => <div>{children}</div>,
  Slide: ({ children }) => children,
}));

function NotificationHarness() {
  const { notifications, addNotification } = useNotifications();

  return (
    <>
      <span data-testid="notification-count">{notifications.length}</span>
      <button
        type="button"
        onClick={() => addNotification({
          id: 42,
          title: 'اعتماد معلق',
          message: 'موافقتك مطلوبة',
          title_en: 'Variation approval pending',
          message_en: 'Your approval is now pending.',
          notification_type: 'approval',
          is_read: false,
          link: '/variations/42/view?project=9',
        })}
      >
        Add notification
      </button>
    </>
  );
}

function CurrentLocation() {
  const location = useLocation();
  return <span data-testid="current-location">{location.pathname}{location.search}</span>;
}

describe('incoming notification popup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAll.mockResolvedValue({ data: [] });
  });

  it('shows a new notification top-right for three seconds and keeps it in the list', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <NotificationProvider>
          <NotificationHarness />
          <CurrentLocation />
        </NotificationProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(mocks.getAll).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('notification-popup')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add notification' }));

    const popup = await screen.findByTestId('notification-popup');
    expect(popup).toHaveAttribute('data-duration', '3000');
    expect(popup).toHaveAttribute('data-position', 'top-right');
    expect(screen.getByText('Variation approval pending')).toBeInTheDocument();
    expect(screen.getByText('Your approval is now pending.')).toBeInTheDocument();
    expect(screen.getByTestId('notification-count')).toHaveTextContent('1');
    expect(mocks.playSound).toHaveBeenCalledTimes(1);
  });

  it('navigates to the notification link when the popup is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <NotificationProvider>
          <NotificationHarness />
          <CurrentLocation />
        </NotificationProvider>
      </MemoryRouter>
    );

    await waitFor(() => expect(mocks.getAll).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Add notification' }));
    fireEvent.click(await screen.findByTestId('notification-popup'));

    expect(screen.getByTestId('current-location')).toHaveTextContent(
      '/variations/42/view?project=9'
    );
  });
});
