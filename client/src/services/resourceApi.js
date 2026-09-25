import axios from 'axios';
import { API_URL } from '../config/appConfig';

export async function fetchSubjectSummary(subjectKey) {
  const response = await axios.get(`${API_URL}/api/resources/subject/${encodeURIComponent(subjectKey)}/summary`);
  return response.data;
}

export async function fetchSubjectResources(subjectKey, limit = 100) {
  const response = await axios.get(`${API_URL}/api/resources`, {
    params: { subjectKey, limit },
  });
  return response.data;
}

export async function recordResourceView(resourceId) {
  if (!resourceId) return;
  await axios.post(`${API_URL}/api/resources/${resourceId}/view`);
}

export async function recordResourceDownload(resourceId) {
  if (!resourceId) return;
  await axios.post(`${API_URL}/api/resources/${resourceId}/download`);
}
