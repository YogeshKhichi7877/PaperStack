import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';
import { authHeader } from './authHeaders';

export async function getQuestionAssistantContext(
  questionId
) {
  const response =
    await axios.get(
      `${API_URL}/api/question-assistant/${questionId}/context`
    );

  return response.data;
}

export async function askSelectedQuestion(
  questionId,
  {
    query,
    useAi = false,
  }
) {
  const response =
    await axios.post(
      `${API_URL}/api/question-assistant/${questionId}/query`,
      {
        query,
        useAi,
      },
      { headers: authHeader() }
    );

  return response.data;
}
