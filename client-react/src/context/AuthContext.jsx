import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [loading, setLoading] = useState(true);

  // Sync Supabase session with Express backend session
  async function syncBackendSession(accessToken) {
    if (!accessToken) return null;
    try {
      const res = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ access_token: accessToken }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setProfileComplete(Boolean(data.profileComplete));
        }
        return data;
      }
    } catch (err) {
      console.error('[AuthContext] Backend sync error:', err);
    }
    return null;
  }

  // Load profile from backend
  async function fetchProfile() {
    try {
      const res = await fetch('/api/auth/profile', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        const complete = Boolean(data.full_name && (data.phone || data.phone_number) && (data.classroom || data.class_room_number));
        setProfileComplete(complete);
        return data;
      }
    } catch (err) {
      console.error('[AuthContext] Fetch profile error:', err);
    }
    return null;
  }

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[AuthContext] Error retrieving session:', error.message);
        }

        if (mounted && initialSession?.user) {
          const isVerified = Boolean(initialSession.user.email_confirmed_at || initialSession.user.confirmed_at);
          if (isVerified) {
            setSession(initialSession);
            setUser(initialSession.user);
            await syncBackendSession(initialSession.access_token);
            await fetchProfile();
          } else {
            // Unverified accounts are not treated as logged in
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
          }
        }
      } catch (e) {
        console.error('[AuthContext] Initialization error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (currentSession?.user) {
          const isVerified = Boolean(currentSession.user.email_confirmed_at || currentSession.user.confirmed_at);
          if (isVerified) {
            setSession(currentSession);
            setUser(currentSession.user);
            await syncBackendSession(currentSession.access_token);
            await fetchProfile();
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setProfileComplete(false);
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch {}
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Server-side Turnstile verification
  async function verifyTurnstileToken(token) {
    let res;
    try {
      res = await fetch('/api/auth/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      });
    } catch (networkErr) {
      // Network error — backend is likely unreachable (Render cold start / down)
      console.error('[AuthContext] Turnstile verify network error:', networkErr);
      throw new Error('Unable to reach the server for security verification. The server may be starting up — please wait a moment and try again.');
    }

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('Security verification returned an unexpected response. Please try again.');
    }

    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Security verification failed. Please try again.');
    }
    return true;
  }

  // 1. Sign Up
  async function signUp({ name, email, password, turnstileToken }) {
    // Verify Turnstile server-side
    await verifyTurnstileToken(turnstileToken);

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = name.trim();

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: normalizedName,
        },
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });

    if (error) {
      let userMsg = error.message;
      if (userMsg.toLowerCase().includes('already registered')) {
        userMsg = 'An account with this email address already exists. Please log in.';
      } else if (userMsg.toLowerCase().includes('password')) {
        userMsg = 'Please choose a stronger password.';
      }
      throw new Error(userMsg);
    }

    return {
      success: true,
      user: data.user,
      session: data.session,
      needsEmailConfirmation: !data.session || !data.user?.email_confirmed_at
    };
  }

  // 2. Sign In
  async function signIn({ email, password, turnstileToken }) {
    // Verify Turnstile server-side
    await verifyTurnstileToken(turnstileToken);

    const normalizedEmail = email.toLowerCase().trim();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password
    });

    if (error) {
      if (error.message.toLowerCase().includes('invalid login credentials')) {
        throw new Error('Email or password is incorrect.');
      } else if (error.message.toLowerCase().includes('email not confirmed')) {
        const err = new Error('Please verify your email before logging in.');
        err.unverified = true;
        throw err;
      }
      throw new Error(error.message);
    }

    const signedInUser = data.user;
    const isVerified = Boolean(signedInUser.email_confirmed_at || signedInUser.confirmed_at);

    if (!isVerified) {
      await supabase.auth.signOut();
      const err = new Error('Please verify your email before logging in.');
      err.unverified = true;
      throw err;
    }

    setSession(data.session);
    setUser(signedInUser);
    await syncBackendSession(data.session.access_token);
    await fetchProfile();

    return { success: true, user: signedInUser, session: data.session };
  }

  // 3. Sign Out
  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[AuthContext] Supabase sign out error:', e);
    }
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('[AuthContext] Backend logout error:', e);
    }
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileComplete(false);
  }

  // 4. Resend verification email
  async function resendVerificationEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw new Error(error.message);
    return true;
  }

  // 5. Send password reset email
  async function resetPasswordForEmail(email) {
    const normalizedEmail = email.toLowerCase().trim();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    // Even if Supabase returns an error, we do not reveal whether the email exists
    if (error && !error.message.toLowerCase().includes('rate limit')) {
      console.warn('[AuthContext] Password reset warning:', error.message);
    }
    return true;
  }

  // 6. Update password (from reset password flow)
  async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        profileComplete,
        loading,
        signUp,
        signIn,
        signOut,
        resendVerificationEmail,
        resetPasswordForEmail,
        updatePassword,
        refreshProfile: fetchProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
