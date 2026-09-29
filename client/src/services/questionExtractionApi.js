import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { adminHeader } from './authHeaders';

export async function getQuestionExtractionStatus() {
  const response = await axios.get(
    `${API_URL}/api/admin/question-extraction/status`,
    { headers: adminHeader() }
  );
  return response.data;
}

export async function getQuestionExtractionPapers(params = {}) {
  const response = await axios.get(
    `${API_URL}/api/admin/question-extraction/papers`,
    {
      headers: adminHeader(),
      params,
    }
  );
  return response.data;
}

export async function extractQuestionsForPaper(paperId, options = {}) {
  const response = await axios.post(
    `${API_URL}/api/admin/question-extraction/paper/${paperId}`,
    options,
    { headers: adminHeader() }
  );
  return response.data;
}

export async function extractQuestionBatch(options = {}) {
  const response = await axios.post(
    `${API_URL}/api/admin/question-extraction/batch`,
    options,
    { headers: adminHeader() }
  );
  return response.data;
}

export async function getQuestionExtractionJob(jobId) {
  const response = await axios.get(
    `${API_URL}/api/admin/question-extraction/jobs/${jobId}`,
    { headers: adminHeader() }
  );
  return response.data;
}
