const board = document.getElementById('board');
const BOARDS_KEY = 'crazywall_boards';
const ACTIVE_BOARD_KEY = 'crazywall_active_board';
let activeBoardId = localStorage.getItem(ACTIVE_BOARD_KEY) || 'board1';

function loadAllBoards() {
  try { return JSON.parse(localStorage.getItem(BOARDS_KEY)) || {}; }
  catch { return {}; }
}

function saveAllBoards(boards) {
  localStorage.setItem(BOARDS_KEY, JSON.stringify(boards));
}

function getBoardData() {
  const boards = loadAllBoards();
  return boards[activeBoardId] || { notes: [], connections: [] };
}

function setBoardData(patch) {
  const boards = loadAllBoards();
  boards[activeBoardId] = { ...getBoardData(), ...patch };
  saveAllBoards(boards);
}

function migrateIfNeeded() {
  const legacy = localStorage.getItem('crazywall_notes');
  if (legacy === null) return;
  if (localStorage.getItem(BOARDS_KEY) !== null) {
    localStorage.removeItem('crazywall_notes');
    localStorage.removeItem('crazywall_connections');
    return;
  }
  const notes = JSON.parse(legacy) || [];
  const connections = JSON.parse(localStorage.getItem('crazywall_connections') || '[]');
  saveAllBoards({ board1: { notes, connections } });
  localStorage.removeItem('crazywall_notes');
  localStorage.removeItem('crazywall_connections');
}

function loadNotes() {
  return getBoardData().notes;
}

function saveNotes() {
  const notes = [...document.querySelectorAll('.note')].map(el => ({
    id: el.dataset.id,
    x: parseInt(el.style.left),
    y: parseInt(el.style.top),
    title: el.querySelector('.note-title').value,
    body: el.querySelector('.note-body').value,
    collapsed: el.classList.contains('collapsed'),
  }));
  setBoardData({ notes });
}

function createNote({ id, x, y, title = '', body = '', collapsed = false } = {}) {
  const noteId = id || crypto.randomUUID();
  const el = document.createElement('div');
  el.className = 'note';
  el.dataset.id = noteId;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.zIndex = nextZ();
  if (collapsed) el.classList.add('collapsed');

  el.innerHTML = `
    <div class="note-titlebar">
      <span class="note-drag-handle" title="Drag to move">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M11 5a1 1 0 1 1 2 0v6h1V7a1 1 0 1 1 2 0v4h1V9a1 1 0 1 1 2 0v5a6 6 0 0 1-6 6H9a5 5 0 0 1-5-5v-3a1 1 0 1 1 2 0v2h1V6a1 1 0 1 1 2 0v5h1V5z"/>
        </svg>
      </span>
      <button class="note-collapse" title="Collapse/expand">
        <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6l5 5 5-5"/>
        </svg>
      </button>
      <input class="note-title" type="text" placeholder="Title" value="${escHtml(title)}">
      <button class="note-delete" title="Delete note">✕</button>
    </div>
    <textarea class="note-body" placeholder="Write something…">${escHtml(body)}</textarea>
  `;

  makeDraggable(el);

  el.querySelector('.note-delete').addEventListener('click', () => {
    if (!confirm('Delete this note?')) return;
    const id = el.dataset.id;
    connections = connections.filter(c => c.id1 !== id && c.id2 !== id);
    saveConnections();
    el.remove();
    drawConnections();
    updateBoardSize();
    saveNotes();
  });

  el.querySelector('.note-collapse').addEventListener('click', () => {
    el.classList.toggle('collapsed');
    drawConnections();
    saveNotes();
  });

  el.querySelector('.note-title').addEventListener('input', saveNotes);
  el.querySelector('.note-body').addEventListener('input', saveNotes);

  el.addEventListener('pointerdown', () => {
    el.style.zIndex = nextZ();
  });

  board.appendChild(el);
  return el;
}

let zCounter = 10;
function nextZ() { return ++zCounter; }

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function makeDraggable(el) {
  const handle = el.querySelector('.note-drag-handle');
  let dragging = false, ox = 0, oy = 0;

  handle.addEventListener('pointerdown', e => {
    dragging = true;
    ox = e.clientX - el.offsetLeft;
    oy = e.clientY - el.offsetTop;
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  handle.addEventListener('pointermove', e => {
    if (!dragging) return;
    const x = Math.max(0, Math.min(e.clientX - ox, board.offsetWidth - el.offsetWidth));
    const y = Math.max(0, Math.min(e.clientY - oy, board.offsetHeight - el.offsetHeight));
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    drawConnections();
  });

  handle.addEventListener('pointerup', () => {
    if (!dragging) return;
    dragging = false;
    saveNotes();
  });
}

document.getElementById('add-board').addEventListener('click', () => {
  const name = prompt('New board name:');
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) { alert('Board name cannot be empty.'); return; }
  const boards = loadAllBoards();
  if (boards[trimmed]) { alert(`A board named "${trimmed}" already exists.`); return; }
  boards[trimmed] = { notes: [], connections: [] };
  saveAllBoards(boards);
  switchBoard(trimmed);
  populateBoardSelect();
});

document.getElementById('add-note').addEventListener('click', () => {
  const margin = 60;
  const x = margin + Math.random() * (window.innerWidth - 260 - margin * 2);
  const y = margin + Math.random() * (window.innerHeight - 220 - margin * 2);
  const note = createNote({ x: Math.round(x), y: Math.round(y) });
  note.querySelector('.note-title').focus();
  saveNotes();
});

// --- Connections ---

let connections = [];
let connMode = false;
let connFirstNote = null;
let selectedConnId = null;

function deselectConn() {
  selectedConnId = null;
  drawConnections();
}

function loadConnections() {
  const data = getBoardData().connections || [];
  return data.map(c => c.id ? c : { id: crypto.randomUUID(), ...c });
}

function saveConnections() {
  setBoardData({ connections });
}

function setConnStatus(msg) {
  const el = document.getElementById('conn-status');
  el.textContent = msg;
  el.classList.toggle('visible', !!msg);
}

function enterConnMode() {
  connMode = true;
  connFirstNote = null;
  document.getElementById('connect-btn').classList.add('active');
  document.querySelectorAll('.note').forEach(n => n.classList.add('conn-target'));
  setConnStatus('Click the first note to connect');
}

function exitConnMode() {
  connMode = false;
  connFirstNote = null;
  document.getElementById('connect-btn').classList.remove('active');
  document.querySelectorAll('.note').forEach(n => n.classList.remove('conn-target', 'conn-selected'));
  setConnStatus('');
}

function noteCenter(el) {
  return {
    x: parseFloat(el.style.left) + el.offsetWidth / 2,
    y: parseFloat(el.style.top) + el.offsetHeight / 2,
  };
}

function getBorderPoint(el, targetX, targetY) {
  const cx = parseFloat(el.style.left) + el.offsetWidth / 2;
  const cy = parseFloat(el.style.top) + el.offsetHeight / 2;
  const dx = targetX - cx;
  const dy = targetY - cy;
  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return { x: cx, y: cy };
  const hw = el.offsetWidth / 2;
  const hh = el.offsetHeight / 2;
  let t = Infinity;
  if (dx > 0) t = Math.min(t, hw / dx);
  else if (dx < 0) t = Math.min(t, -hw / dx);
  if (dy > 0) t = Math.min(t, hh / dy);
  else if (dy < 0) t = Math.min(t, -hh / dy);
  return { x: cx + t * dx, y: cy + t * dy };
}

function drawConnections() {
  const svg = document.getElementById('connections-svg');
  svg.innerHTML = '';
  for (const conn of connections) {
    const el1 = document.querySelector(`.note[data-id="${conn.id1}"]`);
    const el2 = document.querySelector(`.note[data-id="${conn.id2}"]`);
    if (!el1 || !el2) continue;
    const c1 = noteCenter(el1);
    const c2 = noteCenter(el2);
    const p1 = getBorderPoint(el1, c2.x, c2.y);
    const p2 = getBorderPoint(el2, c1.x, c1.y);
    const isSelected = conn.id === selectedConnId;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p1.x); line.setAttribute('y1', p1.y);
    line.setAttribute('x2', p2.x); line.setAttribute('y2', p2.y);
    line.setAttribute('class', 'connection-line' + (isSelected ? ' selected' : ''));
    line.style.pointerEvents = 'none';
    svg.appendChild(line);

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    hit.setAttribute('x1', p1.x); hit.setAttribute('y1', p1.y);
    hit.setAttribute('x2', p2.x); hit.setAttribute('y2', p2.y);
    hit.setAttribute('stroke', 'transparent');
    hit.setAttribute('stroke-width', '12');
    hit.style.cursor = 'pointer';
    const connId = conn.id;
    hit.addEventListener('click', e => {
      if (connMode) return;
      e.stopPropagation();
      selectedConnId = selectedConnId === connId ? null : connId;
      drawConnections();
    });
    svg.appendChild(hit);
  }
}

document.getElementById('connect-btn').addEventListener('click', () => {
  if (connMode) exitConnMode(); else enterConnMode();
});

board.addEventListener('pointerdown', e => {
  if (!connMode) return;
  if (e.target.closest('.note')) e.preventDefault();
}, true);

board.addEventListener('click', e => {
  if (!connMode) return;
  if (e.target.closest('.note-delete')) return;
  const note = e.target.closest('.note');
  if (!note) { exitConnMode(); return; }
  e.stopPropagation();

  if (!connFirstNote) {
    connFirstNote = note;
    note.classList.add('conn-selected');
    setConnStatus('Now click the second note to connect');
  } else if (note === connFirstNote) {
    connFirstNote.classList.remove('conn-selected');
    connFirstNote = null;
    setConnStatus('Click the first note to connect');
  } else {
    const id1 = connFirstNote.dataset.id;
    const id2 = note.dataset.id;
    const exists = connections.some(c =>
      (c.id1 === id1 && c.id2 === id2) || (c.id1 === id2 && c.id2 === id1)
    );
    if (!exists) {
      connections.push({ id: crypto.randomUUID(), id1, id2 });
      saveConnections();
      drawConnections();
    }
    exitConnMode();
  }
}, true);

// --- Import ---

function importFromJson(data) {
  if (!Array.isArray(data)) throw new Error('Expected a JSON array');

  // Map original IDs to new UUIDs
  const idMap = {};
  for (const item of data) {
    idMap[item.id] = crypto.randomUUID();
  }

  // Place imported notes in a grid below all existing notes
  const cols = 3;
  const colW = 280;
  const rowH = 54;
  const padX = 20;
  let startY = 80;
  document.querySelectorAll('.note').forEach(el => {
    startY = Math.max(startY, parseFloat(el.style.top) + el.offsetHeight + 20);
  });

  data.forEach((item, i) => {
    const x = padX + (i % cols) * colW;
    const y = startY + Math.floor(i / cols) * rowH;
    createNote({
      id: idMap[item.id],
      x,
      y,
      title: item.node || '',
      body: '',
      collapsed: true,
    });
  });

  // Parse and add connections (deduplicated)
  const seen = new Set();
  for (const item of data) {
    if (item.connections == null) continue;
    const targets = String(item.connections).split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
    for (const targetId of targets) {
      const uuid1 = idMap[item.id];
      const uuid2 = idMap[targetId];
      if (!uuid1 || !uuid2) continue;
      const key = [uuid1, uuid2].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const exists = connections.some(c =>
        (c.id1 === uuid1 && c.id2 === uuid2) || (c.id1 === uuid2 && c.id2 === uuid1)
      );
      if (!exists) connections.push({ id: crypto.randomUUID(), id1: uuid1, id2: uuid2 });
    }
  }

  saveNotes();
  saveConnections();
  updateBoardSize();
  drawConnections();
}

document.getElementById('template-btn').addEventListener('click', () => {
  const csv = `id,node,connections\n1,"first node","2,3"\n2,"second node","1"\n3,"third node","1"`;
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'crazywall-template.csv';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-input').click();
});

document.getElementById('import-input').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      importFromJson(JSON.parse(ev.target.result));
    } catch (err) {
      alert('Import failed: ' + err.message);
    }
  };
  reader.readAsText(file);
  e.target.value = '';
});

// --- Export ---

document.getElementById('export-btn').addEventListener('click', () => {
  const data = getBoardData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `crazywall-${activeBoardId}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

document.addEventListener('keydown', e => {
  if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnId) {
    const active = document.activeElement;
    if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return;
    connections = connections.filter(c => c.id !== selectedConnId);
    selectedConnId = null;
    saveConnections();
    drawConnections();
  } else if (e.key === 'Escape' && selectedConnId) {
    deselectConn();
  }
});

board.addEventListener('click', e => {
  if (connMode) return;
  if (!e.target.closest('.note') && selectedConnId) deselectConn();
});

// --- Board sizing ---

function updateBoardSize() {
  const pad = 40;
  let w = window.innerWidth;
  let h = window.innerHeight;
  document.querySelectorAll('.note').forEach(el => {
    w = Math.max(w, parseFloat(el.style.left) + el.offsetWidth + pad);
    h = Math.max(h, parseFloat(el.style.top) + el.offsetHeight + pad);
  });
  board.style.width = w + 'px';
  board.style.height = h + 'px';
}

window.addEventListener('resize', updateBoardSize);

// --- Board name / switching ---

function populateBoardSelect() {
  const select = document.getElementById('board-select');
  const boards = loadAllBoards();
  select.innerHTML = '';
  for (const name of Object.keys(boards)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === activeBoardId) opt.selected = true;
    select.appendChild(opt);
  }
}

function switchBoard(newBoardId) {
  activeBoardId = newBoardId;
  localStorage.setItem(ACTIVE_BOARD_KEY, activeBoardId);
  document.querySelectorAll('.note').forEach(el => el.remove());
  connections = loadConnections();
  loadNotes().forEach(createNote);
  updateBoardSize();
  drawConnections();
  document.getElementById('board-name-input').value = activeBoardId;
}

document.getElementById('board-select').addEventListener('change', e => {
  switchBoard(e.target.value);
});

function renameboard(newName) {
  if (!newName || newName === activeBoardId) return;
  const boards = loadAllBoards();
  if (boards[newName]) { alert(`A board named "${newName}" already exists.`); return; }
  boards[newName] = boards[activeBoardId] || { notes: [], connections: [] };
  delete boards[activeBoardId];
  activeBoardId = newName;
  localStorage.setItem(ACTIVE_BOARD_KEY, activeBoardId);
  saveAllBoards(boards);
  populateBoardSelect();
}

document.getElementById('board-name-save').addEventListener('click', () => {
  renameboard(document.getElementById('board-name-input').value.trim());
});

document.getElementById('board-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') renameboard(e.target.value.trim());
});

migrateIfNeeded();
connections = loadConnections();
loadNotes().forEach(createNote);
updateBoardSize();
drawConnections();
document.getElementById('board-name-input').value = activeBoardId;
populateBoardSelect();
