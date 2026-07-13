import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { ModalProvider } from './contexts/ModalContext';
import { WordSessionProvider } from './contexts/WordSessionContext';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <WordSessionProvider>
    <BrowserRouter>
      <ModalProvider>
        <App />
      </ModalProvider>
    </BrowserRouter>
  </WordSessionProvider>
);
