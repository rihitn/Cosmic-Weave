import { supabase } from './supabase.js';

export function loginWithGoogle() {
  return supabase.auth.signInWithOAuth({ provider: 'google' });
}