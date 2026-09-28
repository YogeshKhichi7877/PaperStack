import axios from 'axios';
import { API_URL } from '../config/appConfig';

export async function getImportantTopicsSubjects() {
  const response = await axios.get(
    `${API_URL}/api/important-topics/subjects`
  );
  return response.data;
}

export async function getImportantTopics(
  subjectCode,
  {
    threshold = 72,
    limit = 30,
  } = {}
) {
  const response = await axios.get(
    `${API_URL}/api/important-topics/subject/${encodeURIComponent(subjectCode)}`,
    {
      params: {
        threshold,
        limit,
      },
    }
  );

  return response.data;
}
