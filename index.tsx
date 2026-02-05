import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// --- OAUTH CALLBACK HANDLER ---
// Checks if this window was opened as an OAuth popup redirect
if (window.location.hash && window.location.hash.includes('access_token')) {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const token = params.get('access_token');
  const state = params.get('state'); // Used to identify provider
  
  if (token && window.opener) {
    // Send token back to the main app window
    window.opener.postMessage({ type: 'OAUTH_RESPONSE', token, provider: state }, window.location.origin);
    window.close();
  }
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);