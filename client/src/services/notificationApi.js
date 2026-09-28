import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

import {
  authHeader,
} from './authHeaders';

export async function getNotifications({
  limit = 30,
  unreadOnly = false,
  sync = true,
} = {}) {
  const response =
    await axios.get(
      `${API_URL}/api/notifications`,
      {
        headers:
          authHeader(),
        params: {
          limit,
          unread:
            unreadOnly
              ? 1
              : 0,
          sync:
            sync
              ? 1
              : 0,
        },
      }
    );

  return response.data;
}

export async function markNotificationRead(
  notificationId
) {
  const response =
    await axios.post(
      `${API_URL}/api/notifications/${notificationId}/read`,
      {},
      {
        headers:
          authHeader(),
      }
    );

  return response.data;
}

export async function markAllNotificationsRead() {
  const response =
    await axios.post(
      `${API_URL}/api/notifications/read-all`,
      {},
      {
        headers:
          authHeader(),
      }
    );

  return response.data;
}

export async function syncNotifications() {
  const response =
    await axios.post(
      `${API_URL}/api/notifications/sync`,
      {},
      {
        headers:
          authHeader(),
      }
    );

  return response.data;
}
