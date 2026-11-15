import './utils/pwaInstall';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import {
  isStrictGoogleChrome,
  renderChromeOnlyBlockScreen,
  initProductionAntiInspect,
} from './utils/securityGuard';

if (!isStrictGoogleChrome()) {
  renderChromeOnlyBlockScreen();
} else {
  initProductionAntiInspect();
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}