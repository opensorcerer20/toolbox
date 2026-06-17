// ─── Utility ──────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().slice(0, 10);

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ─── TO-DO LIST ───────────────────────────────────────────────────────────
let todos = load('todos', []);

function saveTodos() { save('todos', todos); }

function renderTodos() {
  const ul = document.getElementById('todo-list');
  ul.innerHTML = '';
  if (!todos.length) { ul.innerHTML = '<li class="empty-msg">No tasks yet.</li>'; return; }
  todos.forEach((t, i) => {
    const li = document.createElement('li');
    if (t.done) li.classList.add('done');
    if (t.category) li.classList.add(`cat-${t.category}`);
    li.innerHTML = `
      <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo(${i})" />
      <span class="todo-text">${escHtml(t.text)}</span>
      <button class="btn-edit" onclick="openEditModal('todo', ${i})">✎</button>
      <button class="btn-del" onclick="deleteTodo(${i})">✕</button>
    `;
    ul.appendChild(li);
  });
  renderCategoryColumn();
}

function addTodo() {
  const inp = document.getElementById('todo-input');
  const text = inp.value.trim();
  if (!text) return;
  const category = document.getElementById('todo-category').value;
  todos.push({ id: Date.now(), text, done: false, category });
  saveTodos();
  renderTodos();
  inp.value = '';
}

function toggleTodo(i) {
  todos[i].done = !todos[i].done;
  saveTodos();
  renderTodos();
}

function deleteTodo(i) {
  todos.splice(i, 1);
  saveTodos();
  renderTodos();
}

document.getElementById('todo-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });

// ─── HABIT TRACKER ────────────────────────────────────────────────────────
let habits = load('habits', []);

function saveHabits() { save('habits', habits); }

function renderHabits() {
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
      <button class="btn-edit" onclick="openEditModal('habit', ${i})">✎</button>
      <button class="btn-del" onclick="deleteHabit(${i})">✕</button>
    `;
    ul.appendChild(li);
  });
  renderCategoryColumn();
}

function addHabit() {
  const inp = document.getElementById('habit-input');
  const name = inp.value.trim();
  if (!name) return;
  const category = document.getElementById('habit-category').value;
  habits.push({ id: Date.now(), name, logs: [], category });
  saveHabits();
  renderHabits();
  inp.value = '';
}

function logHabit(i) {
  const today = todayStr();
  if (!habits[i].logs.includes(today)) habits[i].logs.push(today);
  saveHabits();
  renderHabits();
}

function deleteHabit(i) {
  habits.splice(i, 1);
  saveHabits();
  renderHabits();
}

document.getElementById('habit-input').addEventListener('keydown', e => { if (e.key === 'Enter') addHabit(); });

// ─── MULTI-STEP TASKS ─────────────────────────────────────────────────────
let stepTasks = load('stepTasks', []);

// Keyed by task.id (not index) so deletions don't corrupt expanded state
const expandedSteps = new Set();

function saveStepTasks() { save('stepTasks', stepTasks); }

function toggleExpand(taskId) {
  if (expandedSteps.has(taskId)) expandedSteps.delete(taskId);
  else expandedSteps.add(taskId);
  renderStepTasks();
}

function renderStepTasks() {
  const ul = document.getElementById('step-list');
  ul.innerHTML = '';
  if (!stepTasks.length) { ul.innerHTML = '<li class="empty-msg">No step tasks yet.</li>'; return; }
  stepTasks.forEach((task, ti) => {
    const done = task.current >= task.steps.length;
    const expanded = expandedSteps.has(task.id);
    const progress = `${Math.min(task.current, task.steps.length)}/${task.steps.length}`;
    const arrow = expanded ? '▼' : '▶';

    let stepsHtml;
    if (expanded) {
      stepsHtml = `<div class="step-all-steps">` +
        task.steps.map((s, si) => {
          if (si < task.current) {
            return `<div class="step-row past-step">${escHtml(s)}</div>`;
          } else if (si === task.current && !done) {
            return `<div class="step-row current-step">
               <input type="checkbox" onchange="advanceStep(${ti})" />
               <span class="step-current-text">${escHtml(s)}</span>
             </div>`;
          } else {
            return `<div class="step-row future-step">${escHtml(s)}</div>`;
          }
        }).join('') +
        (done ? `<div class="step-row"><span class="step-done-label">✓ All steps complete!</span></div>` : '') +
      `</div>`;
    } else {
      stepsHtml = `<div class="step-current">
        ${done
          ? `<span class="step-done-label">✓ All steps complete!</span>`
          : `<input type="checkbox" onchange="advanceStep(${ti})" />
             <span class="step-current-text">${escHtml(task.steps[task.current])}</span>`
        }
      </div>`;
    }

    const li = document.createElement('li');
    li.innerHTML = `
      <div class="step-task-name">
        <span class="step-name-left">
          <button class="btn-expand" onclick="toggleExpand(${task.id})" title="Expand steps">${arrow}</button>
          ${escHtml(task.name)}
        </span>
        <span class="step-name-right">
          <span class="step-progress">${progress}</span>
          <button class="btn-del" onclick="deleteStepTask(${ti})">✕</button>
        </span>
      </div>
      ${stepsHtml}
    `;
    ul.appendChild(li);
  });
}

function addStepField() {
  const container = document.getElementById('step-fields');
  const count = container.querySelectorAll('.step-input-row').length + 1;
  const row = document.createElement('div');
  row.className = 'step-input-row';
  row.innerHTML = `
    <input type="text" placeholder="Step ${count}…" />
    <button class="btn-del" onclick="removeStepField(this)">✕</button>
  `;
  container.appendChild(row);
}

function removeStepField(btn) {
  const container = document.getElementById('step-fields');
  if (container.querySelectorAll('.step-input-row').length <= 1) return;
  btn.closest('.step-input-row').remove();
}

function addStepTask() {
  const name = document.getElementById('step-task-input').value.trim();
  if (!name) return;
  const steps = Array.from(document.querySelectorAll('#step-fields input'))
    .map(i => i.value.trim()).filter(Boolean);
  if (!steps.length) return;
  stepTasks.push({ id: Date.now(), name, steps, current: 0 });
  saveStepTasks();
  renderStepTasks();
  document.getElementById('step-task-input').value = '';
  document.getElementById('step-fields').innerHTML = `
    <div class="step-input-row">
      <input type="text" placeholder="Step 1…" />
      <button class="btn-del" onclick="removeStepField(this)">✕</button>
    </div>
  `;
}

function advanceStep(ti) {
  stepTasks[ti].current += 1;
  saveStepTasks();
  renderStepTasks();
}

function deleteStepTask(ti) {
  expandedSteps.delete(stepTasks[ti].id);
  stepTasks.splice(ti, 1);
  saveStepTasks();
  renderStepTasks();
}

// ─── Category overview column ─────────────────────────────────────────────
function renderCategoryColumn() {
  const dayList  = document.getElementById('cat-day-list');
  const nightList = document.getElementById('cat-night-list');
  dayList.innerHTML  = '';
  nightList.innerHTML = '';

  const items = [
    ...todos.filter(t => !t.done).map(t => ({ label: t.text,  category: t.category  || 'day' })),
    ...habits.map(h =>                    ({ label: h.name,   category: h.category  || 'day' })),
  ];

  items.forEach(({ label, category }) => {
    const li = document.createElement('li');
    li.textContent = label;
    li.className = `cat-${category}`;
    (category === 'day' ? dayList : nightList).appendChild(li);
  });

  if (!dayList.children.length)  dayList.innerHTML  = '<li class="empty-msg">None.</li>';
  if (!nightList.children.length) nightList.innerHTML = '<li class="empty-msg">None.</li>';
}

// ─── Edit modal ───────────────────────────────────────────────────────────
let editTarget = null;

function openEditModal(type, index) {
  editTarget = { type, index };
  const item = type === 'todo' ? todos[index] : habits[index];
  const inp = document.getElementById('modal-input');
  inp.value = type === 'todo' ? item.text : item.name;
  document.getElementById('modal-category').value = item.category || 'night';
  document.getElementById('edit-modal').classList.remove('hidden');
  inp.focus();
  inp.select();
}

function closeEditModal() {
  editTarget = null;
  document.getElementById('edit-modal').classList.add('hidden');
}

function saveEdit() {
  if (!editTarget) return;
  const val = document.getElementById('modal-input').value.trim();
  if (!val) return;
  const category = document.getElementById('modal-category').value;
  if (editTarget.type === 'todo') {
    todos[editTarget.index].text = val;
    todos[editTarget.index].category = category;
    saveTodos();
    renderTodos();
  } else {
    habits[editTarget.index].name = val;
    habits[editTarget.index].category = category;
    saveHabits();
    renderHabits();
  }
  closeEditModal();
}

function onModalOverlayClick(e) {
  if (e.target === document.getElementById('edit-modal')) closeEditModal();
}

document.getElementById('modal-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveEdit();
  if (e.key === 'Escape') closeEditModal();
});

// ─── Download ─────────────────────────────────────────────────────────────
function downloadData() {
  const data = { todos, habits, stepTasks, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `todo-board-${todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Migrate ──────────────────────────────────────────────────────────────
const CATEGORY_MAP = { public: 'day', private: 'night' };

function migrate() {
  const todoChanged = todos.reduce((changed, t) => {
    if (CATEGORY_MAP[t.category]) { t.category = CATEGORY_MAP[t.category]; return true; }
    if (!t.category) { t.category = 'day'; return true; }
    return changed;
  }, false);
  if (todoChanged) saveTodos();

  const habitChanged = habits.reduce((changed, h) => {
    if (CATEGORY_MAP[h.category]) { h.category = CATEGORY_MAP[h.category]; return true; }
    if (!h.category) { h.category = 'day'; return true; }
    return changed;
  }, false);
  if (habitChanged) saveHabits();
}

// ─── Init ─────────────────────────────────────────────────────────────────
migrate();
renderTodos();
renderHabits();
renderStepTasks();
setTimeout(() => location.reload(), 10 * 60 * 1000);
