import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

export async function getMockExamSubjects() {
  const response =
    await axios.get(
      `${API_URL}/api/mock-exams/subjects`
    );

  return response.data;
}

export async function generateMockExam(
  payload
) {
  const response =
    await axios.post(
      `${API_URL}/api/mock-exams/generate`,
      payload
    );

  return response.data;
}
