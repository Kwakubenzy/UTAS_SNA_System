import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: { theme?: string; size?: string; width?: number; text?: string; shape?: string }
          ) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCRIPT_ID = 'google-identity-services';

let scriptLoadPromise: Promise<void> | null = null;

const loadGoogleScript = (): Promise<void> => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return scriptLoadPromise;
};

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  disabled?: boolean;
}

/** Renders Google's own "Sign in with Google" button via the Identity Services
 *  SDK. Does nothing (renders null) if no client ID is configured, rather than
 *  showing a button that can never work -- see docs/GOOGLE_LOGIN_SETUP.md. */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onCredential, disabled }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || disabled) return;
    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredential(response.credential),
        });
        containerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
          shape: 'rectangular',
        });
      })
      .catch((err) => {
        console.error(err);
      });

    return () => {
      cancelled = true;
    };
  }, [onCredential, disabled]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-center text-xs text-slate-400">
        Google sign-in isn't configured yet — set VITE_GOOGLE_CLIENT_ID to enable it.
      </p>
    );
  }

  return <div ref={containerRef} className="flex w-full justify-center" />;
};
