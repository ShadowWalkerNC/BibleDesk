'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Sparkles, Eye, EyeOff } from 'lucide-react';
import {
  getAuthToken,
  isLocalStudyProfileEnabled,
  signInRequest,
  signUpRequest,
} from '@/lib/client-auth';
import { syncGuestDataToAccount } from '@/lib/syncGuestData';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [role, setRole] = useState<'member' | 'pastor'>('member');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Check if session already active
  useEffect(() => {
    if (getAuthToken()) {
      router.push('/bible');
      return;
    }
    if (isLocalStudyProfileEnabled()) {
      const local = localStorage.getItem('bibledesk_local_user');
      if (local) {
        router.push('/bible');
      }
    }
  }, [router]);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        await signUpRequest({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          churchName: churchName.trim() || undefined,
          role,
        });

        // Auto-merge local guest bookmarks, notes, and prayer requests
        await syncGuestDataToAccount();
        window.dispatchEvent(new Event('storage'));
        setMessage({ text: 'Account created! Welcome to BibleDesk...', type: 'success' });
        setTimeout(() => {
          router.push('/bible');
          router.refresh();
        }, 800);
      } else {
        await signInRequest(email.trim(), password);

        // Auto-merge local guest items on successful login
        await syncGuestDataToAccount();
        window.dispatchEvent(new Event('storage'));

        setMessage({ text: 'Logged in successfully! Redirecting to Bible reader...', type: 'success' });
        setTimeout(() => {
          router.push('/bible');
          router.refresh();
        }, 800);
      }
    } catch (err: unknown) {
      // Structural check (not instanceof) so mock/proxied errors still surface.
      const text =
        typeof err === 'object' && err !== null && 'message' in err &&
        typeof (err as { message?: unknown }).message === 'string' &&
        (err as { message: string }).message
          ? (err as { message: string }).message
          : 'Sign-in failed. Please try again.';
      // Local / Offline fallback when authentication is not configured.
      // A wrong password must NEVER create a local identity — only an
      // unconfigured deployment (or unreachable server) in an explicitly
      // local/development build falls back.
      const unconfigured =
        text.includes('has not been configured') ||
        text.includes('Failed to fetch') ||
        text.includes('NetworkError') ||
        text.includes('fetch failed');
      if (unconfigured && isLocalStudyProfileEnabled()) {
        const localUser = {
          id: 'local-user-' + Date.now().toString(36),
          email: email.trim(),
          user_metadata: {
            name: name.trim() || email.split('@')[0],
            church_name: churchName.trim() || undefined,
            role,
          },
        };
        localStorage.setItem('bibledesk_local_user', JSON.stringify(localUser));
        window.dispatchEvent(new Event('storage'));
        await syncGuestDataToAccount();
        setMessage({
          text: 'Local study profile ready. Data stays on this device.',
          type: 'success',
        });
        setTimeout(() => {
          router.push('/bible');
          router.refresh();
        }, 600);
        return;
      }
      if (unconfigured) {
        setMessage({ text: 'Account sign-in is temporarily unavailable because authentication has not been configured for this deployment.', type: 'error' });
        return;
      }
      setMessage({ text, type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.main}>
      <div className={styles.authCard}>
        {/* Tab Switcher */}
        <div className={styles.authTabs} role="tablist" aria-label="Authentication Options">
          <button
            type="button"
            role="tab"
            aria-selected={!isSignUp}
            className={`${styles.tabBtn} ${!isSignUp ? styles.tabBtnActive : ''}`}
            onClick={() => {
              setIsSignUp(false);
              setMessage(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isSignUp}
            className={`${styles.tabBtn} ${isSignUp ? styles.tabBtnActive : ''}`}
            onClick={() => {
              setIsSignUp(true);
              setMessage(null);
            }}
          >
            Create Account
          </button>
        </div>

        <h1 className={`${styles.title} text-serif`}>
          {isSignUp ? 'Create your Account' : 'Welcome to BibleDesk'}
        </h1>
        <p className={styles.subtitle}>
          {isSignUp
            ? 'Create an account for authenticated study and Prayer Care features'
            : 'Sign in to access your notes, private prayer circle, and study desk'}
        </p>

        {message && (
          <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
            {message.text}
          </div>
        )}

        {/* Free AI Study Assistant Guarantee */}
        <div className={styles.includedAiNotice}>
          <Sparkles size={18} className={styles.includedAiIcon} />
          <div className={styles.includedAiText}>
            <strong>5-Dimension AI Study Assistant Included</strong>
            <span>A verified account can use 5 server AI answers per day when authentication and the server AI key are configured. You can also use your own Gemini key.</span>
          </div>
        </div>

        <form onSubmit={handleAuth} className={styles.form}>
          {isSignUp && (
            <>
              <div className={styles.formGroup}>
                <label htmlFor="name-input" className={styles.label}>Full Name</label>
                <input
                  id="name-input"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Sarah Jenkins / Caleb"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="church-input" className={styles.label}>Church or Fellowship (Optional)</label>
                <input
                  id="church-input"
                  type="text"
                  value={churchName}
                  onChange={(e) => setChurchName(e.target.value)}
                  placeholder="Grace Fellowship"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="role-select" className={styles.label}>Role</label>
                <select
                  id="role-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'member' | 'pastor')}
                  className={styles.select}
                >
                  <option value="member">Church Member / Study Leader</option>
                  <option value="pastor">Pastor / Teacher</option>
                </select>
              </div>
            </>
          )}

          <div className={styles.formGroup}>
            <label htmlFor="email-input" className={styles.label}>Email Address</label>
            <input
              id="email-input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={styles.input}
              autoComplete="email"
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="password-input" className={styles.label}>Password</label>
            <div className={styles.passwordInputWrapper}>
              <input
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••••• (at least 8 characters)"
                className={styles.input}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.passwordToggleBtn}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? 'Processing...' : isSignUp ? 'Create Account & Unlock AI' : 'Sign In'}
          </button>
        </form>

        {/* 100% Free Bible Guarantee */}
        <div className={styles.sharedBibleNotice} style={{ marginTop: '1.25rem', marginBottom: 0 }}>
          <BookOpen size={16} className={styles.sharedNoticeIcon} />
          <div className={styles.sharedNoticeText}>
            <strong>100% Free &amp; Open Scripture Guarantee</strong>
            <span>All public domain translations (KJV, ASV, WEB, BBE, Darby, YLT), concordance search, and Strong’s lexicons remain forever open without an account.</span>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage(null);
            }}
            className={styles.toggleBtn}
          >
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </main>
  );
}
