import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

export async function getRevisionSheetSubjects() {
  const response = await axios.get(
    `${API_URL}/api/revision-sheets/subjects`
  );

  return response.data;
}

export async function getRevisionSheet(
  subjectCode,
  {
    examType = '',
    threshold = 72,
  } = {}
) {
  const response = await axios.get(
    `${API_URL}/api/revision-sheets/subject/${encodeURIComponent(subjectCode)}`,
    {
      params: {
        examType,
        threshold,
      },
    }
  );

  return response.data;
}
