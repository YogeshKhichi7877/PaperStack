import axios from 'axios';
import { API_URL } from '../config/appConfig';

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => (
      value !== undefined &&
      value !== null &&
      value !== '' &&
      value !== 'All'
    ))
  );
}

export async function browseQuestions(params = {}) {
  const response = await axios.get(`${API_URL}/api/question-browser`, {
    params: cleanParams(params),
  });
  return response.data;
}

export async function getQuestionFacets() {
  const response = await axios.get(`${API_URL}/api/question-browser/facets`);
  return response.data;
}

export async function getRandomQuestion(params = {}) {
  const response = await axios.get(`${API_URL}/api/question-browser/random`, {
    params: cleanParams(params),
  });
  return response.data;
}

export async function getQuestionDetail(questionId) {
  const response = await axios.get(`${API_URL}/api/questions/${questionId}`);
  return response.data;
}

export async function getRelatedQuestions(questionId, limit = 6) {
  const response = await axios.get(`${API_URL}/api/question-browser/${questionId}/related`, { params: { limit } });
  return response.data;
}

export async function getMiniPractice(params = {}) {
  const response = await axios.get(`${API_URL}/api/question-browser/mini-practice`, { params: cleanParams(params) });
  return response.data;
}
