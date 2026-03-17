import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext';
import { PreferencesProvider } from '@/context/PreferencesContext';
import AuthModal from '@/components/AuthModal';
import { Analytics } from '@vercel/analytics/next';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PreferencesProvider>
      <AuthProvider>
        <Component {...pageProps} />
        <AuthModal />
        <Analytics />
      </AuthProvider>
    </PreferencesProvider>
  );
}
