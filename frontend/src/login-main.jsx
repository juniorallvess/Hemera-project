import { createRoot } from 'react-dom/client';
import './index.css';
import AuthScreen from './components/AuthScreen.jsx';

const root = createRoot(document.getElementById('login-root'));
root.render(
  <AuthScreen
    onLoginSuccess={() => (window.location.href = '/')}
  />
);
