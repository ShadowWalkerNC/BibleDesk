'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase';
import Header from '@/components/Header/Header';
import styles from './page.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [churchName, setChurchName] = useState('');
  const [role, setRole] = useState<'member' | 'pastor'>('member');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Check if user is already logged in, redirect if yes
  useEffect(() => {
    const supabase = getBrowserClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push('/bible');
      }
    });
  }, [router]);

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

        if (data.session) {
          setMessage({ text: 'Account created! Logging you in...', type: 'success' });
          setTimeout(() => router.push('/bible'), 1500);
        } else {
          setMessage({ text: 'Signup successful! Please check your email to verify your account.', type: 'success' });
        }
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        setMessage({ text: 'Logged in successfully! Redirecting...', type: 'success' });
        setTimeout(() => {
          router.push('/bible');
          router.refresh();
        }, 1000);
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setMessage({ text: err.message || 'Authentication failed. Please try again.', type: 'error' });
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

      setMessage({ text: 'Magic link sent! Check your email inbox.', type: 'success' });
    } catch (err: any) {
      console.error('Magic Link error:', err);
      setMessage({ text: err.message || 'Failed to send magic link.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={`${styles.authCard} glass-card`}>
          <h1 className={`${styles.title} text-serif`}>
            {isSignUp ? 'Create your Account' : 'Welcome back to BibleDesk'}
          </h1>
          <p className={styles.subtitle}>
            {isSignUp 
              ? 'Join our church study community & sync your journals' 
              : 'Sign in to access your notes, outlines, & community boards'}
          </p>

          {message && (
            <div className={`${styles.alert} ${message.type === 'error' ? styles.alertError : styles.alertSuccess}`}>
              {message.text}
            </div>
          )}

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
                    placeholder="Pastor Caleb / Sarah Jenkins"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="church-input" className={styles.label}>Church / Ministry Name</label>
                  <input
                    id="church-input"
                    type="text"
                    value={churchName}
                    onChange={(e) => setChurchName(e.target.value)}
                    placeholder="Grace Community Church"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="role-select" className={styles.label}>Your Role</label>
                  <select
                    id="role-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as 'member' | 'pastor')}
                    className={styles.select}
                  >
                    <option value="member">Church Member / Youth Group</option>
                    <option value="pastor">Pastor / Sermon Teacher</option>
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
                placeholder="pastor@church.com"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password-input" className={styles.label}>Password</label>
              <input
                id="password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} className={styles.submitBtn}>
              {loading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </button>
          </form>

          <div className={styles.divider}>
            <span>or</span>
          </div>

          <button 
            type="button" 
            disabled={loading} 
            onClick={handleMagicLink} 
            className={styles.otpBtn}
          >
            📧 Send Passwordless Magic Link
          </button>

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
    </>
  );
}
