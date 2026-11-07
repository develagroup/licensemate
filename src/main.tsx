import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { LicenseProvider } from './context/LicenseContext';
import { useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';

function AuthenticatedApp() {
  const { currentUser, isLoading } = useAuth();
  if (isLoading) return <div className="min-h-screen bg-[#0b0d0f]" />;
  return currentUser ? <App /> : <LoginScreen />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LicenseProvider>
        <AuthenticatedApp />
      </LicenseProvider>
    </AuthProvider>
  </StrictMode>,
);
