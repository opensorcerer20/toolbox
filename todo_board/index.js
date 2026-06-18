// ─── Utility ──────────────────────────────────────────────────────────────
const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function load(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ─── TO-DO LIST ───────────────────────────────────────────────────────────
let todos = load('todoboard_todos', []);

function saveTodos() { save('todoboard_todos', todos); }

function renderTodos() {
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
  todos.push({ id: Date.now(), text, done: false, completedOn: null, category });
  saveTodos();
  renderTodos();
  inp.value = '';
}

function toggleTodo(i) {
  todos[i].done = !todos[i].done;
  todos[i].completedOn = todos[i].done ? todayStr() : null;
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
let habits = load('todoboard_habits', []);

function saveHabits() { save('todoboard_habits', habits); }

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
let stepTasks = load('todoboard_stepTasks', []);
let stepEditTarget = null;

// Keyed by task.id (not index) so deletions don't corrupt expanded state
const expandedSteps = new Set();

function saveStepTasks() { save('todoboard_stepTasks', stepTasks); }

// ─── Shared form element factories ───────────────────────────────────────────
function makeCategorySelect(category, extraClass = '') {
  const sel = document.createElement('select');
  sel.className = ['visibility-select', extraClass].filter(Boolean).join(' ');
  ['night', 'day'].forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val.charAt(0).toUpperCase() + val.slice(1);
    if (val === category) opt.selected = true;
    sel.appendChild(opt);
  });
  return sel;
}

function makeStarBtn(starred) {
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

// Builds a single step input row DOM node
function makeStepInputRow(text = '', count = 1, category = 'night', starred = false) {
  const row = document.createElement('div');
  row.className = 'step-input-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = `Step ${count}…`;
  input.value = text;
  row.appendChild(input);

  row.appendChild(makeCategorySelect(category, 'step-row-select'));

  const starBtn = makeStarBtn(starred);
  row.appendChild(starBtn);

  const delBtn = document.createElement('button');
  delBtn.className = 'btn-del';
  delBtn.textContent = '✕';
  delBtn.onclick = () => removeStepField(delBtn);
  row.appendChild(delBtn);

  return row;
}

// Renders a full step task form (name input, step fields, + Step / Cancel / confirm)
// into containerEl. Used for both the add form and the edit modal.
function renderStepTaskForm(containerEl, { name = '', steps = [], nameId, fieldsId, confirmFn, confirmLabel = 'Add Task', cancelFn = null }) {
  containerEl.innerHTML = '';

  const nameRow = document.createElement('div');
  nameRow.className = 'add-row';
  const nameInput = document.createElement('input');
  nameInput.id = nameId;
  nameInput.type = 'text';
  nameInput.placeholder = 'Task name…';
  nameInput.value = name;
  nameRow.appendChild(nameInput);
  containerEl.appendChild(nameRow);

  const fieldsDiv = document.createElement('div');
  fieldsDiv.className = 'step-add-steps';
  fieldsDiv.id = fieldsId;
  const stepArr = steps.length ? steps : [null];
  stepArr.forEach((s, i) => {
    const text = s ? (typeof s === 'string' ? s : s.text) : '';
    const cat  = s && typeof s === 'object' ? (s.category || 'night') : 'night';
    const star = s && typeof s === 'object' ? !!s.starred : false;
    fieldsDiv.appendChild(makeStepInputRow(text, i + 1, cat, star));
  });
  containerEl.appendChild(fieldsDiv);

  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'step-add-steps step-add-actions';

  const addFieldBtn = document.createElement('button');
  addFieldBtn.className = 'btn-add-step-field';
  addFieldBtn.textContent = '+ Step';
  addFieldBtn.onclick = () => {
    const c = document.getElementById(fieldsId);
    c.appendChild(makeStepInputRow('', c.querySelectorAll('.step-input-row').length + 1));
  };
  actionsDiv.appendChild(addFieldBtn);

  if (cancelFn) {
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn-modal-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = cancelFn;
    actionsDiv.appendChild(cancelBtn);
  }

  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn-confirm-task';
  confirmBtn.textContent = confirmLabel;
  confirmBtn.onclick = confirmFn;
  actionsDiv.appendChild(confirmBtn);

  containerEl.appendChild(actionsDiv);
}

function initStepAddForm() {
  renderStepTaskForm(document.getElementById('step-builder'), {
    nameId: 'step-task-input',
    fieldsId: 'step-fields',
    confirmFn: addStepTask,
    confirmLabel: 'Add Task',
  });
}

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
          const cat  = s.category || 'night';
          const star = s.starred ? '<span class="cat-star step-cat-star">★</span>' : '';
          if (si < task.current) {
            return `<div class="step-row past-step cat-${cat}">${star}${escHtml(s.text)}</div>`;
          } else if (si === task.current && !done) {
            return `<div class="step-row current-step cat-${cat}">
               <input type="checkbox" onchange="advanceStep(${ti})" />
               ${star}<span class="step-current-text">${escHtml(s.text)}</span>
             </div>`;
          } else {
            return `<div class="step-row future-step cat-${cat}">${star}${escHtml(s.text)}</div>`;
          }
        }).join('') +
        (done ? `<div class="step-row"><span class="step-done-label">✓ All steps complete!</span></div>` : '') +
      `</div>`;
    } else {
      const s = task.steps[task.current];
      const cat  = done ? '' : (s.category || 'night');
      const star = (!done && s.starred) ? '<span class="cat-star step-cat-star">★</span>' : '';
      stepsHtml = `<div class="step-current${cat ? ` cat-${cat}` : ''}">
        ${done
          ? `<span class="step-done-label">✓ All steps complete!</span>`
          : `<input type="checkbox" onchange="advanceStep(${ti})" />
             ${star}<span class="step-current-text">${escHtml(s.text)}</span>`
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
          <button class="btn-edit" onclick="openStepEditModal(${ti})">✎</button>
          <button class="btn-del" onclick="deleteStepTask(${ti})">✕</button>
        </span>
      </div>
      ${stepsHtml}
    `;
    ul.appendChild(li);
  });
}

function removeStepField(btn) {
  const container = btn.closest('.step-add-steps');
  if (container.querySelectorAll('.step-input-row').length <= 1) return;
  btn.closest('.step-input-row').remove();
}

function addStepTask() {
  const name = document.getElementById('step-task-input').value.trim();
  if (!name) return;
  const steps = Array.from(document.querySelectorAll('#step-fields .step-input-row'))
    .map(row => ({
      text:     row.querySelector('input[type="text"]').value.trim(),
      category: row.querySelector('select').value,
      starred:  row.querySelector('.btn-star').classList.contains('starred'),
    })).filter(s => s.text);
  if (!steps.length) return;
  stepTasks.push({ id: Date.now(), name, steps, current: 0 });
  saveStepTasks();
  renderStepTasks();
  initStepAddForm();
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

// ─── Step-task edit modal ─────────────────────────────────────────────────
function openStepEditModal(ti) {
  stepEditTarget = ti;
  const task = stepTasks[ti];
  renderStepTaskForm(document.getElementById('step-edit-form-body'), {
    name: task.name,
    steps: task.steps,
    nameId: 'step-edit-name',
    fieldsId: 'step-edit-fields',
    confirmFn: saveStepEdit,
    confirmLabel: 'Save',
    cancelFn: closeStepEditModal,
  });
  document.getElementById('step-edit-modal').classList.remove('hidden');
  const nameInput = document.getElementById('step-edit-name');
  nameInput.focus();
  nameInput.select();
  nameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveStepEdit();
    if (e.key === 'Escape') closeStepEditModal();
  });
}

function closeStepEditModal() {
  stepEditTarget = null;
  document.getElementById('step-edit-modal').classList.add('hidden');
}

function saveStepEdit() {
  if (stepEditTarget === null) return;
  const name = document.getElementById('step-edit-name').value.trim();
  if (!name) return;
  const newSteps = Array.from(document.querySelectorAll('#step-edit-fields .step-input-row'))
    .map(row => ({
      text:     row.querySelector('input[type="text"]').value.trim(),
      category: row.querySelector('select').value,
      starred:  row.querySelector('.btn-star').classList.contains('starred'),
    })).filter(s => s.text);
  if (!newSteps.length) return;
  const task = stepTasks[stepEditTarget];
  task.name = name;
  task.steps = newSteps;
  task.current = Math.min(task.current, task.steps.length);
  saveStepTasks();
  renderStepTasks();
  closeStepEditModal();
}

function onStepModalOverlayClick(e) {
  if (e.target === document.getElementById('step-edit-modal')) closeStepEditModal();
}

// ─── Category overview column ─────────────────────────────────────────────
function renderCategoryColumn() {
  const dayList  = document.getElementById('cat-day-list');
  const nightList = document.getElementById('cat-night-list');
  dayList.innerHTML  = '';
  nightList.innerHTML = '';

  const items = [
    ...todos.filter(t => !t.done).map(t => ({ label: t.text, category: t.category || 'day', starred: !!t.starred })),
    ...habits.filter(h => !h.logs.includes(todayStr())).map(h => ({ label: h.name, category: h.category || 'day', starred: !!h.starred })),
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

  const catSlot = document.getElementById('modal-category-slot');
  catSlot.innerHTML = '';
  const catSel = makeCategorySelect(item.category || 'night', 'modal-category-select');
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

function closeEditModal() {
  editTarget = null;
  document.getElementById('edit-modal').classList.add('hidden');
}

function saveEdit() {
  if (!editTarget) return;
  const val = document.getElementById('modal-input').value.trim();
  if (!val) return;
  const category = document.getElementById('modal-category').value;
  const starred = document.getElementById('modal-star').classList.contains('starred');
  if (editTarget.type === 'todo') {
    todos[editTarget.index].text = val;
    todos[editTarget.index].category = category;
    todos[editTarget.index].starred = starred;
    saveTodos();
    renderTodos();
  } else {
    habits[editTarget.index].name = val;
    habits[editTarget.index].category = category;
    habits[editTarget.index].starred = starred;
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
    if (!t.category) { t.category = 'day'; c = true; }
    if (!('starred' in t)) { t.starred = false; c = true; }
    if (!('completedOn' in t)) { t.completedOn = t.done ? todayStr() : null; c = true; }
    return c;
  }, false);
  if (todoChanged) saveTodos();

  const habitChanged = habits.reduce((changed, h) => {
    let c = changed;
    if (CATEGORY_MAP[h.category]) { h.category = CATEGORY_MAP[h.category]; c = true; }
    if (!h.category) { h.category = 'day'; c = true; }
    if (!('starred' in h)) { h.starred = false; c = true; }
    return c;
  }, false);
  if (habitChanged) saveHabits();

  const stepChanged = stepTasks.reduce((changed, task) => {
    let c = changed;
    task.steps = task.steps.map(s => {
      if (typeof s === 'string') { c = true; return { text: s, starred: false, category: 'night' }; }
      if (!('starred' in s))  { c = true; s = { ...s, starred: false }; }
      if (!('category' in s)) { c = true; s = { ...s, category: 'night' }; }
      return s;
    });
    return c;
  }, false);
  if (stepChanged) saveStepTasks();
}

// ─── Init ─────────────────────────────────────────────────────────────────
migrate();
renderTodos();
renderHabits();
initStepAddForm();
renderStepTasks();
document.getElementById('step-edit-modal').addEventListener('keydown', e => {
  if (e.key === 'Escape') closeStepEditModal();
});
function scheduleReloadAtMidnight() {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
  setTimeout(() => location.reload(), midnight - now);
}
scheduleReloadAtMidnight();
