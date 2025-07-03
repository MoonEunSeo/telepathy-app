import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { ModalProvider } from './contexts/ModalContext.jsx';
import { WordSessionProvider } from './contexts/WordSessionContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
 // <React.StrictMode>
    <BrowserRouter>
      <ModalProvider>
      <WordSessionProvider>
        <App />
        </WordSessionProvider>
      </ModalProvider>
    </BrowserRouter>
  // </React.StrictMode>
);
