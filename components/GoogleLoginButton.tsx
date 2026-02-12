import React, { useEffect, useRef } from 'react';
import { LogIn } from 'lucide-react';

interface GoogleLoginButtonProps {
  onSuccess: (credential: string) => void;
  onError: (error: string) => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (element: HTMLElement, config: any) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({ onSuccess, onError }) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [useCustomButton, setUseCustomButton] = React.useState(false);

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    
    // If no client ID, use custom button for demo
    if (!clientId || clientId.includes('your_google_client_id')) {
      setUseCustomButton(true);
      setIsLoading(false);
      return;
    }

    // Load Google Identity Services script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      if (window.google && buttonRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          window.google.accounts.id.renderButton(
            buttonRef.current,
            {
              theme: 'filled_black',
              size: 'large',
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 400
            }
          );

          setIsLoading(false);
        } catch (error) {
          console.error('Google Sign-In initialization failed:', error);
          setUseCustomButton(true);
          setIsLoading(false);
        }
      }
    };

    script.onerror = () => {
      console.error('Failed to load Google Sign-In script');
      setUseCustomButton(true);
      setIsLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleCredentialResponse = (response: any) => {
    if (response.credential) {
      onSuccess(response.credential);
    } else {
      onError('No credential received from Google');
    }
  };

  const handleCustomLogin = () => {
    // Demo mode: create a mock credential
    const mockUser = {
      email: 'player@lastsignal.com',
      sub: 'demo_' + Date.now(),
      name: 'Demo Player',
      picture: '',
      exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
    };

    // Create a mock JWT-like token
    const mockCredential = btoa(JSON.stringify({ header: 'mock' })) + '.' + 
                          btoa(JSON.stringify(mockUser)) + '.' + 
                          btoa('signature');

    onSuccess(mockCredential);
  };

  if (isLoading) {
    return (
      <div className="w-full bg-zinc-800 text-white px-6 py-4 font-bold rounded-lg flex items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        Loading...
      </div>
    );
  }

  if (useCustomButton) {
    return (
      <div className="space-y-3">
        <button 
          onClick={handleCustomLogin}
          className="w-full bg-white text-black px-6 py-4 font-bold rounded-lg hover:bg-zinc-100 transition-all flex items-center justify-center gap-3"
        >
          <LogIn size={20} /> SIGN IN WITH GOOGLE (DEMO)
        </button>
        <p className="text-xs text-zinc-600 text-center">
          Configure VITE_GOOGLE_CLIENT_ID in .env.local for real OAuth
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={buttonRef} className="w-full flex justify-center"></div>
      <p className="text-xs text-zinc-600 text-center">
        Secure authentication via Google
      </p>
    </div>
  );
};

export default GoogleLoginButton;
