import { supabase } from './supabase.js';

export async function loginWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/index.html' }
  });
}

export async function logout() {
  await supabase.auth.signOut();
  window.location.reload();
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

export async function initAuth() {
  const user = await getCurrentUser();
  _updateAuthUI(user);
}

function _updateAuthUI(user) {
  const btn = document.getElementById('auth-btn');
  if (!btn) return;
  if (user) {
    const avatar = user.user_metadata?.avatar_url;
    btn.innerHTML = avatar
      ? `<img src="${avatar}" class="user-avatar" />`
      : (user.email?.split('@')[0] ?? 'user');
    btn.title = 'ログアウト';
    btn.onclick = logout;
    btn.classList.add('logged-in');
  } else {
    btn.textContent = 'login';
    btn.title = 'Googleでログイン';
    btn.onclick = loginWithGoogle;
    btn.classList.remove('logged-in');
  }
}
