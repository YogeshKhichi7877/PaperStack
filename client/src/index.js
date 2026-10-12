import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorState';
import reportWebVitals from './reportWebVitals';
import { HelmetProvider } from 'react-helmet-async';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { inject } from '@vercel/analytics';
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
      <ErrorBoundary><App /></ErrorBoundary>
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
    if (process.env.NODE_ENV !== 'production') {
      // Old offline workers can intercept localhost navigation after a dev restart.
      navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(
        registrations.filter((registration) => [registration.active, registration.waiting, registration.installing]
          .some((worker) => worker?.scriptURL === `${window.location.origin}/service-worker.js`))
          .map((registration) => registration.unregister())
      )).catch(() => {});
      if ('caches' in window) caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('paperstack-pwa-')).map((key) => caches.delete(key)))).catch(() => {});
      return;
    }
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

if (process.env.NODE_ENV === 'production') inject();


// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
