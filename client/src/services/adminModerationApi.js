import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

import {
  adminHeader,
} from './authHeaders';

export async function getAdminModerationQueue({
  kind = 'all',
  limit = 180,
} = {}) {
  const response =
    await axios.get(
      `${API_URL}/api/admin/moderation/queue`,
      {
        headers:
          adminHeader(),
        params: {
          kind,
          limit,
        },
      }
    );

  return response.data;
}

export async function moderateContribution(
  contributionId,
  action,
  {
    adminNote = '',
  } = {}
) {
  const response =
    await axios.patch(
      `${API_URL}/api/admin/contributions/${contributionId}/${action}`,
      {
        adminNote,
      },
      {
        headers:
          adminHeader(),
      }
    );

  return response.data;
}


export async function moderateResourceContribution(
  contributionId,
  action,
  {
    adminNote = '',
  } = {}
) {
  const response =
    await axios.patch(
      `${API_URL}/api/admin/resource-contributions/${contributionId}/${action}`,
      {
        adminNote,
      },
      {
        headers:
          adminHeader(),
      }
    );

  return response.data;
}

export async function moderateSolution(
  solutionId,
  status,
  moderationNote = ''
) {
  const response =
    await axios.patch(
      `${API_URL}/api/admin/question-solutions/${solutionId}`,
      {
        status,
        moderationNote,
      },
      {
        headers:
          adminHeader(),
      }
    );

  return response.data;
}

export async function moderateReport(
  reportId,
  status,
  adminNote = ''
) {
  const response =
    await axios.patch(
      `${API_URL}/api/admin/reports/${reportId}`,
      {
        status,
        adminNote,
      },
      {
        headers:
          adminHeader(),
      }
    );

  return response.data;
}

export async function moderatePaperRequest(
  requestId,
  status
) {
  const response =
    await axios.patch(
      `${API_URL}/api/admin/paper-requests/${requestId}/status`,
      {
        status,
      },
      {
        headers:
          adminHeader(),
      }
    );

  return response.data;
}


export async function moderateExtractedQuestion(
  questionId,
  status
) {
  const response =
    await axios.patch(
      `${API_URL}/api/admin/moderation/questions/${questionId}`,
      {
        status,
      },
      {
        headers:
          adminHeader(),
      }
    );

  return response.data;
}
