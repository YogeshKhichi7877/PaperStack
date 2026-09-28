import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

import {
  adminHeader,
  authHeader,
} from './authHeaders';

export async function getApprovedQuestionSolutions(
  questionId
) {
  const response = await axios.get(
    `${API_URL}/api/question-solutions/question/${questionId}`
  );

  return response.data;
}

export async function getMyQuestionSolution(
  questionId
) {
  const response = await axios.get(
    `${API_URL}/api/question-solutions/mine/${questionId}`,
    {
      headers: authHeader(),
    }
  );

  return response.data;
}

export async function submitQuestionSolution(
  questionId,
  answerText
) {
  const response = await axios.post(
    `${API_URL}/api/question-solutions/question/${questionId}`,
    {
      answerText,
    },
    {
      headers: authHeader(),
    }
  );

  return response.data;
}

export async function deleteMyQuestionSolution(
  questionId
) {
  const response = await axios.delete(
    `${API_URL}/api/question-solutions/mine/${questionId}`,
    {
      headers: authHeader(),
    }
  );

  return response.data;
}

export async function toggleHelpfulSolution(
  solutionId
) {
  const response = await axios.post(
    `${API_URL}/api/question-solutions/${solutionId}/helpful`,
    {},
    {
      headers: authHeader(),
    }
  );

  return response.data;
}

export async function getAdminQuestionSolutions(
  status = 'pending'
) {
  const response = await axios.get(
    `${API_URL}/api/admin/question-solutions`,
    {
      params: {
        status,
        limit: 150,
      },
      headers: adminHeader(),
    }
  );

  return response.data;
}

export async function moderateQuestionSolution(
  solutionId,
  {
    status,
    moderationNote = '',
  }
) {
  const response = await axios.patch(
    `${API_URL}/api/admin/question-solutions/${solutionId}`,
    {
      status,
      moderationNote,
    },
    {
      headers: adminHeader(),
    }
  );

  return response.data;
}
