import { store } from './store.js';
import { initTiles, renderTiles, setEditMode, isEditMode } from './tiles.js';
import { initSpotify, updateAuthUI } from './spotify.js';
import { initMap, showMap, setUnits } from './map.js';
import { handleRedirect, getClientId, redirectUri, logout, isLoggedIn } from './spotify-auth.js';

const $ = (id) => document.getElementById(id);

// ---------- Clock ----------
function tickClock() {
  const d = new Date();
  $('clock').textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  $('date').textContent = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

// ---------- Tabs ----------
function showTab(name) {
  document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
  document.querySelectorAll('.pane').forEach((p) => { p.hidden = p.id !== 'pane-' + name; });
  store.set('tab', name);
  if (name === 'home') showMap();
}

// ---------- Keep the screen on (iOS 16.4+ home screen apps) ----------
let lock = null;
async function keepAwake() {
  try { if ('wakeLock' in navigator && !document.hidden) lock = await navigator.wakeLock.request('screen'); } catch { /* ignore */ }
}

// ---------- Settings ----------
function initSettings() {
  const f = $('settings-form');
  const s = () => store.get('settings', {});
  $('settings-btn').addEventListener('click', () => {
    f.clientId.value = getClientId();
    f.mapsMode.value = s().mapsMode || 'universal';
    f.units.value = s().units || 'mph';
    f.scPrev.value = s().scPrev || ''; f.scPlay.value = s().scPlay || ''; f.scNext.value = s().scNext || '';
    $('redirect-uri').textContent = redirectUri();
    $('settings-logout').hidden = !isLoggedIn();
    $('settings-dialog').showModal();
  });
  $('settings-cancel').addEventListener('click', () => $('settings-dialog').close());
  $('settings-logout').addEventListener('click', () => { logout(); updateAuthUI(); $('settings-dialog').close(); });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = f.clientId.value.trim();
    if (id !== getClientId()) logout(); // tokens belong to the old client
    store.set('clientId', id);
    store.set('settings', { ...s(), mapsMode: f.mapsMode.value, units: f.units.value, scPrev: f.scPrev.value.trim(), scPlay: f.scPlay.value.trim(), scNext: f.scNext.value.trim() });
    renderTiles(); updateAuthUI(); setUnits();
    $('settings-dialog').close();
  });
}

async function main() {
  tickClock(); setInterval(tickClock, 5000);
  document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
  initMap();
  showTab(store.get('tab', 'home'));
  $('edit-btn').addEventListener('click', () => {
    setEditMode(!isEditMode());
    $('edit-btn').setAttribute('aria-pressed', String(isEditMode()));
  });
  initSettings();
  initTiles();

  const result = await handleRedirect(); // finishes Spotify login if we just came back from it
  if (result && !result.ok) $('sp-login-msg').textContent = 'Login failed: ' + result.error;
  initSpotify();

  keepAwake();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) keepAwake(); });
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
main();
