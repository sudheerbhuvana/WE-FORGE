const API_BASE = '/api';

async function safeJson(res) {
  try { return await res.json(); } catch { return {}; }
}

const authService = {
  // Password-based login has been removed. Sign-in happens through NextAuth (Azure AD).
  // Use next-auth/react's signIn() / signOut() in the UI directly.

  async checkAuth() {
    try {
      const res = await fetch(`${API_BASE}/auth/check`, { credentials: 'include' });
      const data = await safeJson(res);
      return data.authenticated === true;
    } catch {
      return false;
    }
  },
};

export default authService;
