import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Spinner from '../components/ui/Spinner';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      // Store token for socket connections
      localStorage.setItem('accessToken', token);
      // Clean up any guest sessions
      localStorage.removeItem('guestToken');
      // Redirect to dashboard, which will re-trigger the auth check
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/auth?error=OAuthFailed', { replace: true });
    }
  }, [searchParams, navigate]);

  return (
    <div className="h-screen w-screen bg-[#030303] flex flex-col items-center justify-center">
      <Spinner size="md" label="Completing Authentication..." />
    </div>
  );
};

export default OAuthCallback;
