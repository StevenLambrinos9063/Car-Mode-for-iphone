// Live map that follows your GPS position (Leaflet + OpenStreetMap tiles, darkened with CSS).
// Turn-by-turn navigation is handed off to Google Maps; this is the "where am I" screen.
import { store } from './store.js';

const $ = (id) => document.getElementById(id);
let map, marker, watchId;
let follow = true;
let lastPos = store.get('lastPos'); // [lat, lng]

const unit = () => store.get('settings', {}).units
  || (/^en-(US|GB)/i.test(navigator.language) ? 'mph' : 'kmh');

export function setUnits() { $('speed-unit').textContent = unit() === 'mph' ? 'mph' : 'km/h'; }

export function initMap() {
  if (!window.L) { $('map-status').textContent = 'Map unavailable'; return; }
  setUnits();
  map = L.map('map', { zoomControl: false, attributionControl: true, center: lastPos || [39.8, -98.6], zoom: lastPos ? 16 : 3 });
  map.attributionControl.setPrefix(false);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  marker = L.marker(lastPos || [0, 0], {
    icon: L.divIcon({ className: 'me', html: '<div class="me-arrow">▲</div>', iconSize: [44, 44], iconAnchor: [22, 22] }),
    interactive: false, keyboard: false,
  });
  if (lastPos) marker.addTo(map);
  map.on('dragstart', () => { follow = false; $('recenter').hidden = false; });
  $('recenter').addEventListener('click', () => {
    follow = true; $('recenter').hidden = true;
    if (lastPos) map.setView(lastPos, Math.max(map.getZoom(), 16));
  });
  startLocation();
}

// The map is created while its tab may be hidden (zero size), so re-measure when shown.
export function showMap() {
  if (!map) return;
  requestAnimationFrame(() => { map.invalidateSize(); if (follow && lastPos) map.setView(lastPos, map.getZoom()); });
}

function startLocation() {
  if (!('geolocation' in navigator)) { $('map-status').textContent = 'Location not supported'; return; }
  watchId = navigator.geolocation.watchPosition(onPosition, onError, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
}

function onPosition(pos) {
  const { latitude, longitude, speed, heading } = pos.coords;
  lastPos = [latitude, longitude];
  store.set('lastPos', lastPos);
  $('map-status').hidden = true;
  if (!map.hasLayer(marker)) marker.addTo(map);
  marker.setLatLng(lastPos);
  if (follow) map.setView(lastPos, map.getZoom() < 15 ? 16 : map.getZoom(), { animate: true });

  const mps = speed == null || speed < 0 ? 0 : speed;
  $('speed-val').textContent = Math.round(mps * (unit() === 'mph' ? 2.23694 : 3.6));
  const arrow = marker.getElement()?.querySelector('.me-arrow');
  if (arrow && heading != null && !Number.isNaN(heading) && mps > 1) arrow.style.transform = `rotate(${heading}deg)`;
}

function onError(err) {
  const st = $('map-status');
  st.hidden = false;
  st.textContent = err.code === 1 ? 'Location is off. Enable it in iOS Settings → Privacy → Location Services.' : 'Finding your location…';
}
