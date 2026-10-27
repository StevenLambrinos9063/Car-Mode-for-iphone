// Spotify Web API remote control: now playing, transport buttons, playlists.
// Note: this app only *controls* Spotify. Audio plays from the Spotify app on the phone
// (and reaches the car over Bluetooth). Playback control requires Spotify Premium.
import { store } from './store.js';
import { getToken, isLoggedIn, login, getClientId } from './spotify-auth.js';

const API = 'https://api.spotify.com/v1';
const $ = (id) => document.getElementById(id);
const POLL_MS = 4000;
const PENDING_TTL = 3 * 60_000;

let state = null;        // last /me/player response (null = no active device)
let syncedAt = 0;        // when `state` was fetched, for progress interpolation
let pollTimer = null;

// ---------- API ----------
async function api(method, path, body, retried = false) {
  const token = await getToken();
  if (!token) return { status: 401 };
  let res;
  try {
    res = await fetch(API + path, {
      method,
      headers: { Authorization: 'Bearer ' + token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { return { status: 0 }; } // offline
  if (res.status === 401 && !retried) {
    const t = store.get('tokens'); if (t) store.set('tokens', { ...t, exp: 0 }); // force refresh
    return api(method, path, body, true);
  }
  if (res.status === 429) return { status: 429 };
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const ok = (r) => r.status >= 200 && r.status < 300;

// ---------- Open the Spotify app when nothing is active ----------
export function openSpotifyApp() {
  location.href = 'spotify://';
}

// Try to start playback on whatever device Spotify knows about; else open the app and
// retry automatically when the user comes back to Car Mode.
async function play(body, { allowOpen = true } = {}) {
  let r = await api('PUT', '/me/player/play', body);
  if (r.status === 404 || r.data?.error?.reason === 'NO_ACTIVE_DEVICE') {
    const d = await api('GET', '/me/player/devices');
    const devices = d.data?.devices || [];
    const dev = devices.find((x) => x.is_active) || devices.find((x) => x.type === 'Smartphone') || devices[0];
    if (dev) r = await api('PUT', '/me/player/play?device_id=' + dev.id, body);
    if (!dev || !ok(r)) {
      if (allowOpen) {
        store.set('pending', { body: body || null, ts: Date.now() });
        setStatus('Opening Spotify…');
        openSpotifyApp();
      } else {
        setStatus('Start playback in Spotify, then tap play.');
      }
      return;
    }
  }
  if (r.status === 403) setStatus('Spotify Premium is required to control playback.');
  await refresh(500);
}

async function resumePending() {
  const p = store.get('pending');
  if (!p) return;
  store.remove('pending');
  if (Date.now() - p.ts > PENDING_TTL) return;
  await new Promise((r) => setTimeout(r, 1500)); // let the Spotify app register as a device
  await play(p.body || undefined, { allowOpen: false });
}

// ---------- Now playing ----------
function setStatus(msg) { $('sp-status').textContent = msg || ''; }

function render() {
  const item = state?.item;
  $('sp-title').textContent = item?.name || (isLoggedIn() ? 'Nothing playing' : 'Spotify');
  $('sp-artist').textContent = item
    ? (item.artists?.map((a) => a.name).join(', ') || item.show?.name || '')
    : (isLoggedIn() ? 'Tap play to open Spotify' : '');
  const art = item?.album?.images?.[0]?.url || item?.images?.[0]?.url || '';
  const img = $('sp-art');
  if (art) { if (img.src !== art) img.src = art; img.hidden = false; } else { img.hidden = true; img.removeAttribute('src'); }
  $('sp-playpause').textContent = state?.is_playing ? '⏸' : '▶';
  $('sp-playpause').setAttribute('aria-label', state?.is_playing ? 'Pause' : 'Play');
  tickProgress();
}

function tickProgress() {
  const item = state?.item;
  if (!item?.duration_ms) { $('sp-progress').style.width = '0%'; return; }
  const pos = state.progress_ms + (state.is_playing ? Date.now() - syncedAt : 0);
  $('sp-progress').style.width = Math.min(100, (pos / item.duration_ms) * 100) + '%';
}

async function refresh(delay = 0) {
  if (!isLoggedIn()) return;
  if (delay) await new Promise((r) => setTimeout(r, delay));
  const r = await api('GET', '/me/player');
  if (r.status === 200 && r.data) {
    state = r.data; syncedAt = Date.now(); setStatus('');
  } else if (r.status === 204) {
    state = null; setStatus('');
  } else if (r.status === 0) {
    setStatus('Offline');
  } else if (r.status === 403) {
    setStatus('Spotify rejected access (Premium needed, or add yourself as a user of the app).');
  } else if (r.status === 401) {
    updateAuthUI();
  }
  render();
}

function startPolling() {
  stopPolling();
  refresh();
  pollTimer = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
}
function stopPolling() { clearInterval(pollTimer); pollTimer = null; }

// ---------- Controls ----------
async function playPause() {
  if (state?.is_playing) {
    state.is_playing = false; render();
    await api('PUT', '/me/player/pause');
    await refresh(400);
  } else {
    if (state) { state.is_playing = true; syncedAt = Date.now(); render(); }
    await play();
  }
}

async function skip(dir) {
  if (!state) { await play(); return; }
  await api('POST', '/me/player/' + dir);
  await refresh(500);
}

// ---------- Playlists ----------
async function loadPlaylists() {
  const grid = $('playlist-grid');
  const cached = store.get('playlists');
  if (cached) drawPlaylists(cached);
  else grid.innerHTML = '<p class="empty">Loading playlists…</p>';
  if (!isLoggedIn()) { grid.innerHTML = '<p class="empty">Log in with Spotify to see playlists here. Without that, add a playlist link as a tile on the Quick tab (Share → Copy link in Spotify).</p>'; return; }
  const r = await api('GET', '/me/playlists?limit=50');
  if (ok(r) && r.data?.items) {
    const lists = r.data.items.filter(Boolean).map((p) => ({
      uri: p.uri, name: p.name, img: p.images?.[0]?.url || '',
    }));
    store.set('playlists', lists);
    drawPlaylists(lists);
  } else if (!cached) {
    grid.innerHTML = `<p class="empty">Couldn't load playlists (${r.status || 'offline'}).</p>`;
  }
}

function drawPlaylists(lists) {
  const grid = $('playlist-grid');
  grid.textContent = '';
  if (!lists.length) { grid.innerHTML = '<p class="empty">No playlists found.</p>'; return; }
  for (const p of lists) {
    const b = document.createElement('button');
    b.className = 'tile playlist';
    b.type = 'button';
    if (p.img) { const i = document.createElement('img'); i.src = p.img; i.alt = ''; i.loading = 'lazy'; b.append(i); }
    const s = document.createElement('span'); s.textContent = p.name; b.append(s);
    b.addEventListener('click', () => play({ context_uri: p.uri }));
    grid.append(b);
  }
}

// ---------- Auth UI ----------
function drawFallback() {
  const cfg = store.get('settings', {});
  const sc = (name) => (name ? 'shortcuts://run-shortcut?name=' + encodeURIComponent(name) : '');
  let any = false;
  for (const [id, key] of [['sc-prev', 'scPrev'], ['sc-play', 'scPlay'], ['sc-next', 'scNext']]) {
    const a = $(id), href = sc(cfg[key]);
    if (href) { a.href = href; any = true; } else a.removeAttribute('href');
  }
  $('sp-sc').hidden = !any;
  $('sp-login-btn').hidden = !getClientId();
}

export function updateAuthUI() {
  const on = isLoggedIn();
  if (!on) drawFallback();
  $('sp-login').hidden = on;
  $('sp-player').hidden = !on;
  if (on) startPolling(); else { stopPolling(); state = null; }
  loadPlaylists();
}

export function initSpotify() {
  $('sp-login-btn').addEventListener('click', async () => {
    try { await login(); } catch (e) { setStatus(e.message); $('sp-login-msg').textContent = e.message; }
  });
  $('sp-playpause').addEventListener('click', playPause);
  $('sp-next').addEventListener('click', () => skip('next'));
  $('sp-prev').addEventListener('click', () => skip('previous'));
  $('sp-open').addEventListener('click', openSpotifyApp);
  setInterval(tickProgress, 500);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    resumePending();
    refresh();
  });
  updateAuthUI();
  resumePending();
}
