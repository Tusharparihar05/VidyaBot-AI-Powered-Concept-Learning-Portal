import { useCallback, useEffect, useState } from 'react';
import RobotScene from '../components/auth/RobotScene';
import SignupForm from '../components/auth/SignupForm';
import SignInForm from '../components/auth/SignInForm';

type AuthPanel = 'signup' | 'signin';

function pathToPanel(pathname: string): AuthPanel {
  return pathname === '/signin' ? 'signin' : 'signup';
}

export default function Auth() {
  const [isExplaining, setIsExplaining] = useState(false);
  const [panel, setPanel] = useState<AuthPanel>(() =>
    typeof window !== 'undefined' ? pathToPanel(window.location.pathname) : 'signup',
  );

  const goSignup = useCallback(() => {
    setPanel('signup');
    window.history.pushState({}, '', '/');
  }, []);

  const goSignin = useCallback(() => {
    setPanel('signin');
    window.history.pushState({}, '', '/signin');
  }, []);

  useEffect(() => {
    const onPop = () => setPanel(pathToPanel(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return (
    <div
      className="min-h-screen w-screen flex flex-col items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse 120% 80% at 50% 50%, #e8f5f0 0%, #f0f4f2 40%, #e4ece8 100%)',
        minHeight: '100vh',
      }}
    >
      <div
        className="relative w-full overflow-hidden rounded-3xl shadow-2xl flex"
        style={{
          maxWidth: '1020px',
          maxHeight: '720px',
          height: 'calc(100vh - 40px)',
          minHeight: '580px',
          boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)',
        }}
      >
        <div className="hidden md:block" style={{ width: '60%', flexShrink: 0 }}>
          <RobotScene isExplaining={isExplaining} />
        </div>

        <div
          className="flex flex-col"
          style={{
            width: '40%',
            minWidth: '320px',
            flexGrow: 1,
            background: '#ffffff',
            borderLeft: '1px solid rgba(0,0,0,0.04)',
          }}
        >
          {panel === 'signup' ? (
            <SignupForm
              onFocus={() => setIsExplaining(true)}
              onBlur={() => setIsExplaining(false)}
              onGoToSignIn={goSignin}
            />
          ) : (
            <SignInForm
              onFocus={() => setIsExplaining(true)}
              onBlur={() => setIsExplaining(false)}
              onGoToSignup={goSignup}
            />
          )}
        </div>
      </div>
    </div>
  );
}
