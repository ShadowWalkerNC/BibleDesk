'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Sparkles, Eye, EyeOff, Mail, CheckCircle } from 'lucide-react';
import { getBrowserClient } from '@/lib/supabase';
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
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/bible');
      }
    });
  }, [router]);

  // Google OAuth sign in
  async function handleGoogleSignIn() {
    setLoading(true);
    setMessage(null);
    const supabase = getBrowserClient();

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/bible`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setMessage({ text: err.message || 'Google sign-in failed. Please try again.', type: 'error' });
      setLoading(false);
    }
  }

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = getBrowserClient();

    try {
      if (isSignUp) {
        // Sign Up with Name, Church, and Role in user metadata
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || undefined,
              church_name: churchName || undefined,
              role,
            },
          },
        });

        if (error) throw error;

        // Auto-merge local guest bookmarks, notes, and prayer requests
        await syncGuestDataToAccount();

        if (data.session) {
          setMessage({ text: 'Account created! Welcome to BibleDesk...', type: 'success' });
          setTimeout(() => {
            router.push('/bible');
            router.refresh();
          }, 1200);
        } else {
          setMessage({ 
            text: 'Account registered! If confirmation is required, please check your inbox to verify.', 
            type: 'success' 
          });
        }
      } else {
        // Sign In
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Auto-merge local guest items on successful login
        await syncGuestDataToAccount();

        setMessage({ text: 'Logged in successfully! Redirecting to Bible reader...', type: 'success' });
        setTimeout(() => {
          router.push('/bible');
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setMessage({ text: err.message || 'Authentication failed. Please check your credentials.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setMessage({ text: 'Please enter your email address first.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);

    const supabase = getBrowserClient();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/bible`,
        },
      });

      if (error) throw error;

      setMessage({ text: 'Magic link sent! Check your email inbox to sign in instantly.', type: 'success' });
    } catch (err: any) {
      console.error('Magic Link error:', err);
      setMessage({ text: err.message || 'Failed to send magic link.', type: 'error' });
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
            ? 'Join our study community, sync prayer circles, and unlock the 5D AI Assistant' 
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
            <span>Creating an account unlocks Google Gemini-powered Scripture study (15 questions/hr). No API key setup required.</span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          disabled={loading}
          onClick={handleGoogleSignIn}
          className={styles.googleBtn}
          aria-label="Continue with Google"
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.36 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className={styles.divider}>
          <span>or continue with email</span>
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

        <div className={styles.divider}>
          <span>or passwordless</span>
        </div>

        <button 
          type="button" 
          disabled={loading} 
          onClick={handleMagicLink} 
          className={styles.otpBtn}
        >
          <Mail size={16} />
          <span>Send Magic Link to Email</span>
        </button>

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
