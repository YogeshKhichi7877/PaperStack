import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

function isValidGoogleClientId(id) {
  return Boolean(
    id &&
    id === id.trim() &&
    id.includes('.apps.googleusercontent.com') &&
    !/["'\s]/.test(id)
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
const app = (
  <>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </>
);

if (process.env.NODE_ENV === 'development' && googleClientId && !isValidGoogleClientId(googleClientId)) {
  console.warn('Google login is disabled because REACT_APP_GOOGLE_CLIENT_ID is not a valid Web OAuth client ID.');
}

root.render(
  isValidGoogleClientId(googleClientId)
    ? <GoogleOAuthProvider clientId={googleClientId}>{app}</GoogleOAuthProvider>
    : app
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('PaperStack service worker registered:', registration.scope);
      })
      .catch((error) => {
        console.warn('PaperStack service worker registration failed:', error);
      });
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
