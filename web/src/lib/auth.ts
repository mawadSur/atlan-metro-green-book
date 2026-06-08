import { supabase } from './supabase';
import type { Session, AuthChangeEvent } from '@supabase/supabase-js';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Send a password-reset email. The link returns the user to the portal where
 * they can set a new password via updatePassword(). Safe to call from the
 * browser; uses window.location.origin so the redirect matches the live host.
 */
export async function requestPasswordReset(email: string) {
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/portal` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

/**
 * Set a new password for the currently authenticated (recovery) session.
 */
export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export function onAuthChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
