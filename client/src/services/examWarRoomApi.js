import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

export async function getExamWarRoomSubjects() {
  const response =
    await axios.get(
      `${API_URL}/api/exam-war-room/subjects`
    );

  return response.data;
}

export async function getExamWarRoom(
  subjectCode,
  {
    examType = '',
    threshold = 72,
    minutes = 60,
  } = {}
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
      }
    );

  return response.data;
}
