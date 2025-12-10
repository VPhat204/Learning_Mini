import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import "./languages/i18n";
import '../node_modules/antd/dist/reset.css';
import reportWebVitals from './reportWebVitals';
import { UserProvider } from "./context/userContext";
import { ThemeProvider } from './context/themeContext';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <UserProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </UserProvider>
  </React.StrictMode>
);
reportWebVitals();
