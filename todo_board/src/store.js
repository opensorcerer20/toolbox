// ─── Utility ──────────────────────────────────────────────────────────────
export const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const yesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

// ─── Pub/sub (notifies CategoryPanel subscribers on any state change) ──────
const _listeners = new Set();
export function subscribe(fn) { _listeners.add(fn); return () => _listeners.delete(fn); }
function notify() { _listeners.forEach(fn => fn()); }

// ─── TO-DO LIST ───────────────────────────────────────────────────────────
export let todos = load('todoboard_todos', []);

export function saveTodos() { save('todoboard_todos', todos); }

let _setTodosState = null;
export function registerTodosSetter(fn) { _setTodosState = fn; }

export function syncTodos(updated) {
  todos = updated;
  save('todoboard_todos', updated);
  if (_setTodosState) _setTodosState(updated);
  notify();
}

// ─── HABIT TRACKER ────────────────────────────────────────────────────────
export let habits = load('todoboard_habits', []);

export function saveHabits() { save('todoboard_habits', habits); }

let _setHabitsState = null;
export function registerHabitsSetter(fn) { _setHabitsState = fn; }

export function syncHabits(updated) {
  habits = updated;
  save('todoboard_habits', updated);
  if (_setHabitsState) _setHabitsState(updated);
  notify();
}

// ─── MULTI-STEP TASKS ─────────────────────────────────────────────────────
export let stepTasks = load('todoboard_stepTasks', []);

export function saveStepTasks() { save('todoboard_stepTasks', stepTasks); }

export function syncStepTasks(tasks) {
  stepTasks = tasks;
  save('todoboard_stepTasks', tasks);
  notify();
}

// ─── Edit modal hook (wired up by App, called by TodoPanel / HabitPanel) ──
let _openEditModal = null;
export function registerOpenEditModal(fn) { _openEditModal = fn; }
export function openEditModal(type, index) { if (_openEditModal) _openEditModal(type, index); }

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
    if (!('logWhen' in h)) { h.logWhen = 'today'; c = true; }
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
