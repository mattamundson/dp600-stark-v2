import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { App } from './app/App';
import { SettingsProvider } from './app/providers/SettingsProvider';
import { ToastProvider } from './app/providers/ToastProvider';
import './styles/globals.css';

const root = document.getElementById('root');
if (!root) throw new Error('No #root element');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <SettingsProvider>
      <ToastProvider>
        <HashRouter>
          <App />
        </HashRouter>
      </ToastProvider>
    </SettingsProvider>
  </React.StrictMode>
);
