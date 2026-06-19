// ─── Utility ──────────────────────────────────────────────────────────────
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

export function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export const CATEGORY  = Object.freeze({ DAY: 'day', NIGHT: 'night' });
export const TASK_TYPE = Object.freeze({ TODO: 'todo', HABIT: 'habit', STEP_TASK: 'stepTask' });

export function createTask({ type, name, category, starred = false }) {
  return { id: Date.now(), type, name, category, starred, completedOn: null, logs: [] };
}

// ─── TO-DO LIST ───────────────────────────────────────────────────────────
export let todos = load('todoboard_todos', []);

export function saveTodos() { save('todoboard_todos', todos); }

export function renderTodos() {
  const ul = document.getElementById('todo-list');
  ul.innerHTML = '';
  const today = todayStr();
  const visible = todos.map((_, i) => i).filter(i => !todos[i].completedOn || todos[i].completedOn >= today);
  if (!visible.length) { ul.innerHTML = '<li class="empty-msg">No tasks yet.</li>'; return; }
  const order = visible.sort((a, b) => todos[a].done - todos[b].done);
  order.forEach(i => {
    const t = todos[i];
    const li = document.createElement('li');
    if (t.done) li.classList.add('done');
    if (t.category) li.classList.add(`cat-${t.category}`);
    li.innerHTML = `
      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo(${i})" />
      <span class="todo-text">${escHtml(t.text)}</span>
      <button class="btn-edit" onclick="openEditModal('${TASK_TYPE.TODO}', ${i})">✎</button>
      <button class="btn-del" onclick="deleteTodo(${i})">✕</button>
    `;
    ul.appendChild(li);
  });
  renderCategoryColumn();
}

export function addTodo() {
  const inp = document.getElementById('todo-input');
  const text = inp.value.trim();
  if (!text) return;
  const category = document.getElementById('todo-category').value;
  todos.push({ id: Date.now(), text, done: false, completedOn: null, category });
  saveTodos();
  renderTodos();
  inp.value = '';
}

export function toggleTodo(i) {
  todos[i].done = !todos[i].done;
  todos[i].completedOn = todos[i].done ? todayStr() : null;
  saveTodos();
  renderTodos();
}

export function deleteTodo(i) {
  todos.splice(i, 1);
  saveTodos();
  renderTodos();
}

// ─── HABIT TRACKER ────────────────────────────────────────────────────────
export let habits = load('todoboard_habits', []);

export function saveHabits() { save('todoboard_habits', habits); }

export function renderHabits() {
  const ul = document.getElementById('habit-list');
  ul.innerHTML = '';
  if (!habits.length) { ul.innerHTML = '<li class="empty-msg">No habits yet.</li>'; return; }
  const today = todayStr();
  habits.forEach((h, i) => {
    const loggedToday = h.logs.includes(today);
    const li = document.createElement('li');
    if (h.category) li.classList.add(`cat-${h.category}`);
    li.innerHTML = `
      <span class="habit-name">${escHtml(h.name)}</span>
      <span class="habit-count">${h.logs.length}×</span>
      <button class="btn-habit-log ${loggedToday ? 'done-today' : ''}"
        ${loggedToday ? 'disabled' : `onclick="logHabit(${i})"`}>
        ${loggedToday ? '✓ Done' : 'Log'}
      </button>
      <button class="btn-edit" onclick="openEditModal('${TASK_TYPE.HABIT}', ${i})">✎</button>
      <button class="btn-del" onclick="deleteHabit(${i})">✕</button>
    `;
    ul.appendChild(li);
  });
  renderCategoryColumn();
}

export function addHabit() {
  const inp = document.getElementById('habit-input');
  const name = inp.value.trim();
  if (!name) return;
  const category = document.getElementById('habit-category').value;
  habits.push({ id: Date.now(), name, logs: [], category });
  saveHabits();
  renderHabits();
  inp.value = '';
}

export function logHabit(i) {
  const today = todayStr();
  if (!habits[i].logs.includes(today)) habits[i].logs.push(today);
  saveHabits();
  renderHabits();
}

export function deleteHabit(i) {
  habits.splice(i, 1);
  saveHabits();
  renderHabits();
}

// ─── MULTI-STEP TASKS ─────────────────────────────────────────────────────
// stepTasks is kept here so renderCategoryColumn can read it.
// StepPanel component mutates it via syncStepTasks.
export let stepTasks = load('todoboard_stepTasks', []);

export function saveStepTasks() { save('todoboard_stepTasks', stepTasks); }

export function syncStepTasks(tasks) {
  stepTasks = tasks;
  save('todoboard_stepTasks', tasks);
  renderCategoryColumn();
}

// ─── Shared form element factories (used by todo/habit edit modal) ─────────
export function makeCategorySelect(category, extraClass = '') {
  const sel = document.createElement('select');
  sel.className = ['visibility-select', extraClass].filter(Boolean).join(' ');
  [CATEGORY.NIGHT, CATEGORY.DAY].forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val.charAt(0).toUpperCase() + val.slice(1);
    if (val === category) opt.selected = true;
    sel.appendChild(opt);
  });
  return sel;
}

export function makeStarBtn(starred) {
  const btn = document.createElement('button');
  btn.className = starred ? 'btn-star starred' : 'btn-star';
  btn.textContent = starred ? '★' : '☆';
  btn.onclick = () => {
    const now = !btn.classList.contains('starred');
    btn.classList.toggle('starred', now);
    btn.textContent = now ? '★' : '☆';
  };
  return btn;
}

// ─── Category overview column ─────────────────────────────────────────────
export function renderCategoryColumn() {
  const dayList   = document.getElementById('cat-day-list');
  const nightList = document.getElementById('cat-night-list');
  if (!dayList || !nightList) return;
  dayList.innerHTML   = '';
  nightList.innerHTML = '';

  const items = [
    ...todos.filter(t => !t.done).map(t => ({ label: t.text, category: t.category || CATEGORY.DAY, starred: !!t.starred })),
    ...habits.filter(h => !h.logs.includes(todayStr())).map(h => ({ label: h.name, category: h.category || CATEGORY.DAY, starred: !!h.starred })),
    ...stepTasks.filter(t => t.current < t.steps.length).map(t => {
      const s = t.steps[t.current];
      return { label: `${t.name}: ${s.text}`, category: s.category || CATEGORY.NIGHT, starred: !!s.starred };
    }),
  ];

  items.sort((a, b) => b.starred - a.starred);

  items.forEach(({ label, category, starred }) => {
    const li = document.createElement('li');
    li.className = `cat-${category}`;
    if (starred) {
      const star = document.createElement('span');
      star.className = 'cat-star';
      star.textContent = '★';
      li.appendChild(star);
    }
    li.appendChild(document.createTextNode(label));
    (category === CATEGORY.DAY ? dayList : nightList).appendChild(li);
  });

  if (!dayList.children.length)   dayList.innerHTML   = '<li class="empty-msg">None.</li>';
  if (!nightList.children.length) nightList.innerHTML = '<li class="empty-msg">None.</li>';
}

// ─── Edit modal (todos & habits) ──────────────────────────────────────────
export let editTarget = null;

export function openEditModal(type, index) {
  editTarget = { type, index };
  const item = type === TASK_TYPE.TODO ? todos[index] : habits[index];
  const inp = document.getElementById('modal-input');
  inp.value = type === TASK_TYPE.TODO ? item.text : item.name;

  const catSlot = document.getElementById('modal-category-slot');
  catSlot.innerHTML = '';
  const catSel = makeCategorySelect(item.category || CATEGORY.NIGHT, 'modal-category-select');
  catSel.id = 'modal-category';
  catSlot.appendChild(catSel);

  const starSlot = document.getElementById('modal-star-slot');
  starSlot.innerHTML = '';
  const starBtn = makeStarBtn(!!item.starred);
  starBtn.id = 'modal-star';
  starSlot.appendChild(starBtn);

  document.getElementById('edit-modal').classList.remove('hidden');
  inp.focus();
  inp.select();
}

export function closeEditModal() {
  editTarget = null;
  document.getElementById('edit-modal').classList.add('hidden');
}

export function saveEdit() {
  if (!editTarget) return;
  const val      = document.getElementById('modal-input').value.trim();
  if (!val) return;
  const category = document.getElementById('modal-category').value;
  const starred  = document.getElementById('modal-star').classList.contains('starred');
  if (editTarget.type === TASK_TYPE.TODO) {
    todos[editTarget.index].text     = val;
    todos[editTarget.index].category = category;
    todos[editTarget.index].starred  = starred;
    saveTodos();
    renderTodos();
  } else {
    habits[editTarget.index].name     = val;
    habits[editTarget.index].category = category;
    habits[editTarget.index].starred  = starred;
    saveHabits();
    renderHabits();
  }
  closeEditModal();
}

export function onModalOverlayClick(e) {
  if (e.target === document.getElementById('edit-modal')) closeEditModal();
}

// ─── Download ─────────────────────────────────────────────────────────────
export function downloadData() {
  const data = { todos, habits, stepTasks, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `todo-board-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Migrate ──────────────────────────────────────────────────────────────
const CATEGORY_MAP = { public: CATEGORY.DAY, private: CATEGORY.NIGHT };

export function migrate() {
  [['todos', 'todoboard_todos'], ['habits', 'todoboard_habits'], ['stepTasks', 'todoboard_stepTasks']].forEach(([oldKey, newKey]) => {
    const existing = localStorage.getItem(oldKey);
    if (existing !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, existing);
    }
    localStorage.removeItem(oldKey);
  });

  todos     = load('todoboard_todos',     []);
  habits    = load('todoboard_habits',    []);
  stepTasks = load('todoboard_stepTasks', []);

  const todoChanged = todos.reduce((changed, t) => {
    let c = changed;
    if (CATEGORY_MAP[t.category]) { t.category = CATEGORY_MAP[t.category]; c = true; }
    if (!t.category) { t.category = CATEGORY.DAY; c = true; }
    if (!('starred' in t)) { t.starred = false; c = true; }
    if (!('completedOn' in t)) { t.completedOn = t.done ? todayStr() : null; c = true; }
    return c;
  }, false);
  if (todoChanged) saveTodos();

  const habitChanged = habits.reduce((changed, h) => {
    let c = changed;
    if (CATEGORY_MAP[h.category]) { h.category = CATEGORY_MAP[h.category]; c = true; }
    if (!h.category) { h.category = CATEGORY.DAY; c = true; }
    if (!('starred' in h)) { h.starred = false; c = true; }
    return c;
  }, false);
  if (habitChanged) saveHabits();

  const stepChanged = stepTasks.reduce((changed, task) => {
    let c = changed;
    task.steps = task.steps.map(s => {
      if (typeof s === 'string') { c = true; return { text: s, starred: false, category: CATEGORY.NIGHT }; }
      if (!('starred' in s))  { c = true; s = { ...s, starred: false }; }
      if (!('category' in s)) { c = true; s = { ...s, category: CATEGORY.NIGHT }; }
      return s;
    });
    return c;
  }, false);
  if (stepChanged) saveStepTasks();
}

export function scheduleReloadAtMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  setTimeout(() => location.reload(), midnight - now);
}

// ─── Expose functions for inline HTML event handlers ──────────────────────
Object.assign(window, {
  toggleTodo, deleteTodo, addTodo,
  logHabit, deleteHabit, addHabit,
  openEditModal, closeEditModal, saveEdit, onModalOverlayClick,
  downloadData,
});
