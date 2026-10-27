// Spotify Authorization Code flow with PKCE (no client secret, safe for static hosting).
import { store } from './store.js';
import { DEFAULT_CLIENT_ID, SCOPES } from './config.js';

const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';

export const getClientId = () => (store.get('clientId') || DEFAULT_CLIENT_ID || '').trim();

// Must match the Redirect URI registered in the Spotify dashboard exactly.
export const redirectUri = () => location.origin + location.pathname.replace(/index\.html$/, '');

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const random = (n) => b64url(crypto.getRandomValues(new Uint8Array(n))).slice(0, n);

export const isLoggedIn = () => !!store.get('tokens')?.refresh;

export async function login() {
  const clientId = getClientId();
  if (!clientId) throw new Error('Add your Spotify Client ID in Settings first.');
  const verifier = random(96);
  const state = random(16);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  store.set('pkce', { verifier, state });
  location.href = AUTH_URL + '?' + new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: SCOPES.join(' '),
    state,
  });
}

export function logout() {
  store.remove('tokens');
  store.remove('pkce');
}

async function tokenRequest(params) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: getClientId(), ...params }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error_description || data.error || `Token error ${res.status}`);
    err.code = data.error;
    throw err;
  }
  const prev = store.get('tokens') || {};
  store.set('tokens', {
    access: data.access_token,
    refresh: data.refresh_token || prev.refresh, // refresh responses may omit it
    exp: Date.now() + data.expires_in * 1000,
  });
}

// Call once on page load. Returns null if this isn't an OAuth callback, else { ok, error? }.
export async function handleRedirect() {
  const q = new URLSearchParams(location.search);
  if (!q.has('code') && !q.has('error')) return null;
  const pkce = store.get('pkce');
  store.remove('pkce');
  history.replaceState(null, '', redirectUri());
  if (q.has('error')) return { ok: false, error: q.get('error') };
  if (!pkce || pkce.state !== q.get('state')) return { ok: false, error: 'State mismatch, try logging in again.' };
  try {
    await tokenRequest({
      grant_type: 'authorization_code',
      code: q.get('code'),
      redirect_uri: redirectUri(),
      code_verifier: pkce.verifier,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// Returns a valid access token, refreshing if it expires within a minute. Null if logged out.
export async function getToken() {
  let t = store.get('tokens');
  if (!t?.refresh) return null;
  if (Date.now() > t.exp - 60_000) {
    try {
      await tokenRequest({ grant_type: 'refresh_token', refresh_token: t.refresh });
    } catch (e) {
      if (e.code === 'invalid_grant') logout(); // revoked: force a fresh login
      return null;
    }
    t = store.get('tokens');
  }
  return t.access;
}
