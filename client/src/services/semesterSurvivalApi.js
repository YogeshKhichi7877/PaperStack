import axios from 'axios';
import { API_URL } from '../config/appConfig';

export async function getSemesterSurvivalOptions() {
  const response = await axios.get(
    `${API_URL}/api/semester-survival/options`
  );
  return response.data;
}

export async function getSemesterSurvivalPack({
  branch = 'CSE',
  semester = 1,
  examType = '',
} = {}) {
  const response = await axios.get(
    `${API_URL}/api/semester-survival`,
    {
      params: {
        branch,
        semester,
        examType,
      },
    }
  );

  return response.data;
}
