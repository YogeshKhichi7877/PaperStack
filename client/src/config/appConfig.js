export const API_URL =
  process.env.REACT_APP_API_URL ||
  process.env.REACT_APP_BACKEND_URL ||
  'http://localhost:5000';

export const FRONTEND_URL =
  process.env.REACT_APP_FRONTEND_URL || 'http://localhost:3000';

export const CONTRIBUTION_EMAIL =
  process.env.REACT_APP_CONTRIBUTION_EMAIL || 'paperstack@example.com';

export const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

export function isValidGoogleClientId(id) {
  return Boolean(
    id &&
      id === id.trim() &&
      id.includes('.apps.googleusercontent.com') &&
      !/["'\s]/.test(id)
  );
}

export const GOOGLE_AUTH_CONFIGURED = isValidGoogleClientId(GOOGLE_CLIENT_ID);
