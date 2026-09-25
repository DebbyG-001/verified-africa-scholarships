import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { StoreProvider } from './lib/store.jsx';
import { AuthProvider } from './lib/auth.jsx';
import { ToastProvider, ConfirmProvider } from './components/ui.jsx';
import './styles/base.css';
import './styles/components.css';
import './styles/pages.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
      <StoreProvider>
        <ToastProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </ToastProvider>
      </StoreProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
