import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SplitFlapOverlay } from './components/SplitFlap';
import '../styles.css';
import '../professional.css';
import '../landing.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <SplitFlapOverlay />
  </StrictMode>,
);
