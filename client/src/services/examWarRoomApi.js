import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';
import { cachedPublicRequest } from './publicRequestCache';

export async function getExamWarRoomSubjects() {
  return cachedPublicRequest('exam-war-room:subjects', async () => {
    const response = await axios.get(`${API_URL}/api/exam-war-room/subjects`);
    return response.data;
  });
}

export async function getExamWarRoom(
  subjectCode,
  {
    examType = '',
    threshold = 72,
    minutes = 60,
  } = {},
  options = {}
) {
  const response =
    await axios.get(
      `${API_URL}/api/exam-war-room/subject/${encodeURIComponent(
        subjectCode
      )}`,
      {
        params: {
          examType,
          threshold,
          minutes,
        },
        signal: options.signal,
        timeout: 60_000,
      }
    );

  return response.data;
}
