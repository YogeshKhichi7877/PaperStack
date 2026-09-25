import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { authHeader } from './authHeaders';

export async function analyzeContributionPdf(file) {
  const data = new FormData();
  data.append('file', file);

  const response = await axios.post(`${API_URL}/api/contributions/analyze`, data, {
    headers: authHeader(),
    timeout: 45000,
  });

  return response.data?.analysis || null;
}
