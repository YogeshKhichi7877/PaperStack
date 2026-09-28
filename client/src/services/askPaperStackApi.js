import axios from 'axios';

import { API_URL } from '../config/appConfig';
import { authHeader } from './authHeaders';

export async function getAskPaperStackSubjects() {
  const response = await axios.get(
    `${API_URL}/api/ask-paperstack/subjects`
  );

  return response.data;
}

export async function queryAskPaperStack(payload) {
  const response = await axios.post(
    `${API_URL}/api/ask-paperstack/query`,
    payload,
    { headers: authHeader() }
  );

  return response.data;
}
