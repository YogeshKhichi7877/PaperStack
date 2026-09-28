import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

import {
  authHeader,
} from './authHeaders';

export function localDayKey() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() +
      1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );

  return (
    `${year}-${month}-${day}`
  );
}

export async function pingStudyActivity({
  category,
  route,
}) {
  const response =
    await axios.post(
      `${API_URL}/api/streaks/ping`,
      {
        localDate:
          localDayKey(),
        category,
        route,
      },
      {
        headers:
          authHeader(),
      }
    );

  return response.data;
}

export async function getMyStudyStreak() {
  const response =
    await axios.get(
      `${API_URL}/api/streaks/me`,
      {
        headers:
          authHeader(),
        params: {
          localDate:
            localDayKey(),
        },
      }
    );

  return response.data;
}
