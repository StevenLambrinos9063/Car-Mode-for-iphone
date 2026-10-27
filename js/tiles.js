// Navigate + Quick Action tiles: storage, link building, rendering, add/edit dialog.
import { store } from './store.js';

export const KINDS = {
  nav:      { label: 'Navigate to address', ph: '1 Main St, Springfield', icon: '📍' },
  call:     { label: 'Call a number',        ph: '+1 555 123 4567',        icon: '📞' },
  sms:      { label: 'Messages (number optional)', ph: '+1 555 123 4567 or leave blank', icon: '💬', optional: true },
  shortcut: { label: 'Siri Shortcut name',   ph: 'Exact name of the shortcut', icon: '⚡' },
  url:      { label: 'Any link / app URL',   ph: 'https://… or app://…',   icon: '🔗' },
};
const GROUP_KINDS = { nav: ['nav'], quick: ['call', 'sms', 'shortcut', 'url'] };

const DEFAULTS = [
  { id: 'home', group: 'nav', kind: 'nav', label: 'Home', icon: '🏠', value: '' },
  { id: 'work', group: 'nav', kind: 'nav', label: 'Work', icon: '💼', value: '' },
  { id: 'msgs', group: 'quick', kind: 'sms', label: 'Messages', icon: '💬', value: '' },
];

let tiles = store.get('tiles') || DEFAULTS;
let editMode = false;
const $ = (id) => document.getElementById(id);
const save = () => store.set('tiles', tiles);

export function urlFor(t) {
  const v = (t.value || '').trim();
  switch (t.kind) {
    case 'nav': {
      const q = encodeURIComponent(v);
      return store.get('settings', {}).mapsMode === 'app'
        ? `comgooglemaps://?daddr=${q}&directionsmode=driving`
        : `https://www.google.com/maps/dir/?api=1&destination=${q}&travelmode=driving&dir_action=navigate`;
    }
    case 'call': return 'tel:' + v.replace(/[^\d+*#,;]/g, '');
    case 'sms': return 'sms:' + v.replace(/[^\d+,;]/g, '');
    case 'shortcut': return 'shortcuts://run-shortcut?name=' + encodeURIComponent(v);
    default: return v;
  }
}

const needsValue = (t) => !KINDS[t.kind].optional && !(t.value || '').trim();

// Real <a href> elements: iOS is most reliable at handing universal links / URL schemes
// off to other apps from an actual anchor tap.
function tileEl(t) {
  const a = document.createElement('a');
  a.className = `tile ${t.group}`;
  const empty = needsValue(t);
  if (!empty) a.href = urlFor(t);
  a.innerHTML = '<i></i><span></span><small></small>';
  a.querySelector('i').textContent = t.icon || KINDS[t.kind].icon;
  a.querySelector('span').textContent = t.label;
  a.querySelector('small').textContent = editMode ? 'Edit' : empty ? 'Tap to set up' : '';
  a.addEventListener('click', (e) => {
    if (editMode || empty) { e.preventDefault(); openEditor(t); }
  });
  return a;
}

export function renderTiles() {
  for (const [group, id, withAdd] of [['nav', 'nav-grid', true], ['quick', 'quick-grid', true], ['nav', 'home-grid', false]]) {
    const grid = $(id);
    grid.textContent = '';
    tiles.filter((t) => t.group === group).forEach((t) => grid.append(tileEl(t)));
    if (editMode && withAdd) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'tile add';
      add.innerHTML = '<i>＋</i><span>Add</span>';
      add.addEventListener('click', () => openEditor(null, group));
      grid.append(add);
    }
  }
}

export function setEditMode(on) {
  editMode = on;
  document.body.classList.toggle('editing', on);
  renderTiles();
}
export const isEditMode = () => editMode;

// ---------- Editor dialog ----------
let editing = null; // { tile|null, group }

function openEditor(tile, group = tile?.group) {
  editing = { tile, group };
  const f = $('tile-form');
  const kinds = GROUP_KINDS[group];
  f.kind.innerHTML = kinds.map((k) => `<option value="${k}">${KINDS[k].label}</option>`).join('');
  f.kind.value = tile?.kind || kinds[0];
  f.kind.closest('label').hidden = kinds.length === 1;
  f.label.value = tile?.label || '';
  f.icon.value = tile?.icon || '';
  f.value.value = tile?.value || '';
  $('tile-title').textContent = tile ? 'Edit tile' : 'New tile';
  $('tile-delete').hidden = !tile;
  syncPlaceholder();
  $('tile-dialog').showModal();
}

function syncPlaceholder() {
  const f = $('tile-form');
  f.value.placeholder = KINDS[f.kind.value].ph;
}

export function initTiles() {
  const f = $('tile-form');
  f.kind.addEventListener('change', syncPlaceholder);
  $('tile-cancel').addEventListener('click', () => $('tile-dialog').close());
  $('tile-delete').addEventListener('click', () => {
    if (editing?.tile && confirm(`Delete "${editing.tile.label}"?`)) {
      tiles = tiles.filter((t) => t.id !== editing.tile.id);
      save(); renderTiles(); $('tile-dialog').close();
    }
  });
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    const kind = f.kind.value;
    const data = {
      group: editing.group, kind,
      label: f.label.value.trim() || KINDS[kind].label,
      icon: f.icon.value.trim() || KINDS[kind].icon,
      value: f.value.value.trim(),
    };
    if (editing.tile) Object.assign(editing.tile, data);
    else tiles.push({ id: 't' + Date.now().toString(36), ...data });
    save(); renderTiles(); $('tile-dialog').close();
  });
  renderTiles();
}
