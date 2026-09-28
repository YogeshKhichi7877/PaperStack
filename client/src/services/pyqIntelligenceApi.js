import axios from 'axios';
import { API_URL } from '../config/appConfig';

export async function getPyqIntelligenceSubjects() {
  const response = await axios.get(`${API_URL}/api/pyq-intelligence/subjects`);
  return response.data;
}

export async function getSubjectPyqIntelligence(subjectCode, threshold = 72) {
  const response = await axios.get(
    `${API_URL}/api/pyq-intelligence/subject/${encodeURIComponent(subjectCode)}`,
    {
      params: { threshold },
    }
  );
  return response.data;
}
