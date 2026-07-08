import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { ModalProvider } from './contexts/ModalContext';
import { WordSessionProvider } from './contexts/WordSessionContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  // <React.StrictMode>
  <WordSessionProvider>
    <BrowserRouter>
      <ModalProvider>
        <App />
      </ModalProvider>
    </BrowserRouter>
  </WordSessionProvider>
  // </React.StrictMode>
);
