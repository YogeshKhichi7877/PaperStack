import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { authHeader } from './authHeaders';

export async function fetchPaperBounties() {
  const response = await axios.get(`${API_URL}/api/missing-papers`);
  return response.data || { summary: null, missingPapers: [] };
}

export async function requestPaperBounty(item) {
  if (item?.requestId) {
    const response = await axios.post(
      `${API_URL}/api/paper-requests/${item.requestId}/vote`,
      {},
      { headers: authHeader() }
    );
    return response.data;
  }

  const response = await axios.post(
    `${API_URL}/api/paper-requests`,
    {
      subject: item?.subject || '',
      subjectCode: item?.subjectCode || '',
      shortCode: item?.shortCode || '',
      branch: item?.branch || 'CSE',
      semester: Number(item?.semester),
      year: Number(item?.year),
      examType: item?.examType || '',
    },
    { headers: authHeader() }
  );
  return response.data;
}
