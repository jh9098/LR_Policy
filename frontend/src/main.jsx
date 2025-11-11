// frontend/src/main.jsx
// React/Vite 진입점. App 내부에서 firebaseClient.js를 통해 Firestore와 통신한다.

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { AuthDialogProvider } from './contexts/AuthDialogContext.jsx';
import { SectionTitlesProvider } from './contexts/SectionTitlesContext.jsx';
import { SignupFormSettingsProvider } from './contexts/SignupFormSettingsContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <AuthDialogProvider>
            <SectionTitlesProvider>
              <SignupFormSettingsProvider>
                <App />
              </SignupFormSettingsProvider>
            </SectionTitlesProvider>
          </AuthDialogProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>
);
