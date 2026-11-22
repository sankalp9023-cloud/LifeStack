import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpenCheck, Eye, EyeOff, Layers3 } from 'lucide-react';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/context/AuthContext';
import './auth.css';

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.06H12v3.9h5.38a4.6 4.6 0 0 1-2 3.02v2.53h3.24c1.9-1.75 2.98-4.33 2.98-7.39Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.38l-3.24-2.53c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.58-4.1H3.07v2.61A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.42 13.95A6 6 0 0 1 6.1 12c0-.68.12-1.34.32-1.95V7.44H3.07A10 10 0 0 0 2 12c0 1.64.39 3.2 1.07 4.56l3.35-2.61Z" />
      <path fill="#EA4335" d="M12 5.95c1.47 0 2.78.5 3.82 1.5l2.87-2.86C16.96 2.98 14.7 2 12 2a10 10 0 0 0-8.93 5.44l3.35 2.61C7.2 7.7 9.4 5.95 12 5.95Z" />
    </svg>
  );
}

export default function AuthPage({ mode = 'login' }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const googleButton = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1').replace(/\/$/, '');
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const authenticate = useCallback(async (endpoint, payload) => {
    setNotice('');
    setSubmitting(true);
    try {
      const response = await fetch(`${apiBase}/auth/${endpoint}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setNotice(result?.error?.message || 'We could not sign you in. Please try again.');
        return;
      }
      await checkAuth();
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch {
      setNotice('Could not reach the account service. Check that the LifeStack API is running.');
    } finally {
      setSubmitting(false);
    }
  }, [apiBase, navigate]);

  useEffect(() => {
    if (!googleClientId || !googleButton.current) return undefined;
    let disposed = false;
    const renderGoogleButton = () => {
      if (disposed || !googleButton.current || !window.google?.accounts?.id) return false;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (credentialResponse) => {
          if (!credentialResponse.credential) {
            setNotice('Google sign-in did not return a credential. Please try again.');
            return;
          }
          void authenticate('google', { idToken: credentialResponse.credential });
        },
      });
      googleButton.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButton.current, {
        type: 'standard',
        theme: 'filled_black',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: Math.min(360, googleButton.current.clientWidth || 360),
      });
      return true;
    };

    if (renderGoogleButton()) return () => { disposed = true; };
    let script = document.querySelector('script[data-lifestack-google-identity]');
    const createdScript = !script;
    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.dataset.lifestackGoogleIdentity = 'true';
    }
    script.addEventListener('load', renderGoogleButton);
    if (createdScript) document.head.appendChild(script);
    return () => {
      disposed = true;
      script?.removeEventListener('load', renderGoogleButton);
    };
  }, [authenticate, googleClientId]);

  const submit = (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const payload = {
      email: String(values.get('email') || ''),
      password: String(values.get('password') || ''),
    };
    if (isSignup) payload.name = String(values.get('name') || '');
    void authenticate(isSignup ? 'signup' : 'login', payload);
  };

  return (
    <main className="auth-page">
      <div className="auth-atmosphere" aria-hidden="true">
        <span className="auth-orb auth-orb-one" />
        <span className="auth-orb auth-orb-two" />
        <span className="auth-grid" />
      </div>

      <div className="auth-topline">
        <Link to={ROUTES.LOGIN} className="auth-brand" aria-label="LifeStack sign in">
          <span className="auth-brand-mark"><Layers3 size={19} strokeWidth={1.8} /></span>
          <span>LifeStack</span>
        </Link>
        <span className="auth-topline-note">Your life, in focus.</span>
      </div>

      <div className="auth-layout">
        <section className="auth-intro" aria-label="LifeStack introduction">
          <div className="auth-intro-mark"><BookOpenCheck size={22} strokeWidth={1.7} /></div>
          <p className="auth-eyebrow">A little more clarity, every day</p>
          <h1>Make room for<br /><span>what matters.</span></h1>
          <p className="auth-intro-copy">Bring your studies, projects, and daily tasks into one thoughtful space.</p>
          <div className="auth-intro-rule"><span /></div>
          <p className="auth-privacy-note">A calmer way to keep your momentum.</p>
        </section>

        <section className="auth-card" aria-labelledby="auth-heading">
          <div className="auth-card-heading">
            <p className="auth-eyebrow">Welcome {isSignup ? 'aboard' : 'back'}</p>
            <h2 id="auth-heading">{isSignup ? 'Create your account' : 'Sign in to LifeStack'}</h2>
            <p>{isSignup ? 'Start bringing your plans together.' : 'Pick up where you left off.'}</p>
          </div>

          {googleClientId ? (
            <div className="auth-google-widget" ref={googleButton} aria-label="Continue with Google" />
          ) : (
            <button type="button" className="auth-google-button" onClick={() => setNotice('Google sign-in needs a Google client ID in the frontend and backend environment.')}>
              <GoogleMark />
              <span>Continue with Google</span>
            </button>
          )}

          <div className="auth-divider"><span>or continue with email</span></div>

          <form className="auth-form" onSubmit={submit}>
            {isSignup && (
              <label className="auth-field">
                <span>Your name</span>
                <input autoComplete="name" name="name" placeholder="Alex Morgan" required disabled={submitting} />
              </label>
            )}
            <label className="auth-field">
              <span>Email address</span>
              <input autoComplete="email" name="email" type="email" placeholder="you@example.com" required disabled={submitting} />
            </label>
            <label className="auth-field">
              <span className="auth-field-label">
                <span>Password</span>
                {!isSignup && <button type="button" className="auth-text-button" onClick={() => setNotice('Password recovery will be available when account services are connected.')}>Forgot password?</button>}
              </span>
              <span className="auth-password-wrap">
                <input autoComplete={isSignup ? 'new-password' : 'current-password'} name="password" type={showPassword ? 'text' : 'password'} placeholder={isSignup ? 'At least 8 characters' : 'Enter your password'} minLength={isSignup ? 8 : undefined} required disabled={submitting} />
                <button type="button" className="auth-password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>
            {isSignup && <p className="auth-helper">Use at least 8 characters for your password.</p>}
            <button type="submit" className="auth-submit-button" disabled={submitting}>
              <span>{submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}</span>
              <ArrowRight size={17} />
            </button>
          </form>

          {!isSignup && (
            <div className="auth-guest-action">
              <button
                type="button"
                className="auth-guest-button"
                onClick={() => navigate(ROUTES.DASHBOARD, { replace: true })}
                disabled={submitting}
              >
                <span>Continue as guest</span>
                <ArrowRight size={15} />
              </button>
              <p>Use local storage on this device without a cloud account.</p>
            </div>
          )}

          {notice && <p className="auth-notice" role="status">{notice}</p>}

          <p className="auth-switch">
            {isSignup ? 'Already have an account?' : 'New to LifeStack?'}{' '}
            <Link to={isSignup ? ROUTES.LOGIN : ROUTES.SIGNUP}>{isSignup ? 'Sign in' : 'Create an account'}</Link>
          </p>
        </section>
      </div>

      <footer className="auth-footer">
        <span>© {new Date().getFullYear()} LifeStack</span>
        <span>Built for your next step.</span>
      </footer>
    </main>
  );
}
