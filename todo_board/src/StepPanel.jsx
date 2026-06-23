import {
  useEffect,
  useRef,
  useState,
} from 'preact/hooks';

import {
  CATEGORY,
  load,
  syncStepTasks,
} from './store';

const STORAGE_KEY = 'todoboard_stepTasks';
const emptyStep   = () => ({ text: '', category: CATEGORY.NIGHT, starred: false, done: false });

// Migrate old tasks that used a `current` index instead of per-step `done` flags
function migrateTask(t) {
  if (t.steps.length === 0 || 'done' in t.steps[0]) return t;
  const current = t.current ?? 0;
  return { ...t, steps: t.steps.map((s, i) => ({ ...s, done: i < current })) };
}

function StepFields({ idPrefix, steps, onChange, onRemove, showDone = false }) {
  return (
    <div class="step-add-steps" id={idPrefix}>
      {steps.map((s, i) => (
        <div class="step-input-row" key={i}>
          {showDone && (
            <div style={{width: 30}}>
            <input
              type="checkbox"
              class="step-done-check"
              checked={!!s.done}
              onChange={() => onChange(i, 'done', !s.done)}
              title="Mark step complete"
            />
            </div>
          )}
          <input
            type="text"
            placeholder={`Step ${i + 1}…`}
            value={s.text}
            onInput={e => onChange(i, 'text', e.target.value)}
          />
          <select
            class="visibility-select step-row-select"
            value={s.category}
            onChange={e => onChange(i, 'category', e.target.value)}
          >
            <option value={CATEGORY.NIGHT}>Night</option>
            <option value={CATEGORY.DAY}>Day</option>
          </select>
          <button
            type="button"
            class={`btn-star${s.starred ? ' starred' : ''}`}
            onClick={() => onChange(i, 'starred', !s.starred)}
          >{s.starred ? '★' : '☆'}</button>
          <button
            type="button"
            class="btn-del"
            onClick={() => onRemove(i)}
            disabled={steps.length <= 1}
          >✕</button>
        </div>
      ))}
    </div>
  );
}

export default function StepPanel() {
  const [tasks,     setTasks]     = useState(() => load(STORAGE_KEY, []).map(migrateTask));
  const [expanded,  setExpanded]  = useState(() => new Set());
  const [newName,   setNewName]   = useState('');
  const [newSteps,  setNewSteps]  = useState([emptyStep()]);
  const [editIdx,   setEditIdx]   = useState(null);
  const [editName,  setEditName]  = useState('');
  const [editSteps, setEditSteps] = useState([emptyStep()]);
  const editNameRef = useRef(null);

  useEffect(() => {
    if (editIdx !== null && editNameRef.current) {
      editNameRef.current.focus();
      editNameRef.current.select();
    }
  }, [editIdx]);

  function persist(updated) {
    syncStepTasks(updated);
    setTasks(updated);
  }

  // ─── Add form ─────────────────────────────────────────────────────────────
  function changeNew(i, field, val) {
    setNewSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }
  function removeNew(i) {
    if (newSteps.length <= 1) return;
    setNewSteps(prev => prev.filter((_, idx) => idx !== i));
  }
  function addTask() {
    const name  = newName.trim();
    const steps = newSteps.filter(s => s.text.trim()).map(s => ({ ...s, done: false }));
    if (!name || !steps.length) return;
    persist([...tasks, { id: Date.now(), name, steps }]);
    setNewName('');
    setNewSteps([emptyStep()]);
  }

  // ─── List actions ─────────────────────────────────────────────────────────
  function advanceStep(ti) {
    persist(tasks.map((t, i) => {
      if (i !== ti) return t;
      const idx = t.steps.findIndex(s => !s.done);
      if (idx === -1) return t;
      return { ...t, steps: t.steps.map((s, si) => si === idx ? { ...s, done: true } : s) };
    }));
  }
  function deleteTask(ti) {
    const id = tasks[ti].id;
    setExpanded(prev => { const s = new Set(prev); s.delete(id); return s; });
    persist(tasks.filter((_, i) => i !== ti));
  }
  function toggleExpand(id) {
    setExpanded(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  // ─── Edit modal ───────────────────────────────────────────────────────────
  function openEdit(ti) {
    const t = tasks[ti];
    setEditName(t.name);
    setEditSteps(t.steps.map(s => ({ ...s })));
    setEditIdx(ti);
  }
  function closeEdit() { setEditIdx(null); }
  function changeEdit(i, field, val) {
    setEditSteps(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  }
  function removeEdit(i) {
    if (editSteps.length <= 1) return;
    setEditSteps(prev => prev.filter((_, idx) => idx !== i));
  }
  function saveEdit() {
    const name  = editName.trim();
    const steps = editSteps.filter(s => s.text.trim());
    if (!name || !steps.length) return;
    persist(tasks.map((t, i) => i !== editIdx ? t : { ...t, name, steps }));
    closeEdit();
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div class="panel">
      <h2>Step-by-Step2</h2>

      {/* Add form */}
      <div class="add-row">
        <input
          id="step-task-input"
          type="text"
          placeholder="Task name…"
          value={newName}
          onInput={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTask(); }}
        />
      </div>
      <StepFields idPrefix="step-fields" steps={newSteps} onChange={changeNew} onRemove={removeNew} />
      <div class="step-add-steps step-add-actions">
        <button
          type="button"
          class="btn-add-step-field"
          onClick={() => setNewSteps(prev => [...prev, emptyStep()])}
        >+ Step</button>
        <button type="button" class="btn-confirm-task" onClick={addTask}>Add Task</button>
      </div>

      {/* Task list */}
      <ul id="step-list">
        {tasks.length === 0
          ? <li class="empty-msg">No step tasks yet.</li>
          : tasks.map((task, ti) => {
              const currentIdx = task.steps.findIndex(s => !s.done);
              const done       = currentIdx === -1;
              const isExpanded = expanded.has(task.id);
              const progress   = `${task.steps.filter(s => s.done).length}/${task.steps.length}`;

              let stepsContent;
              if (isExpanded) {
                stepsContent = (
                  <div class="step-all-steps">
                    {task.steps.map((s, si) => {
                      const cat  = s.category || CATEGORY.NIGHT;
                      const star = s.starred ? <span class="cat-star step-cat-star">★</span> : null;
                      if (s.done) {
                        return <div class={`step-row past-step cat-${cat}`}>{star}{s.text}</div>;
                      } else if (si === currentIdx) {
                        return (
                          <div class={`step-row current-step cat-${cat}`}>
                            <input type="checkbox" onChange={() => advanceStep(ti)} />
                            {star}<span class="step-current-text">{s.text}</span>
                          </div>
                        );
                      } else {
                        return <div class={`step-row future-step cat-${cat}`}>{star}{s.text}</div>;
                      }
                    })}
                    {done && <div class="step-row"><span class="step-done-label">✓ All steps complete!</span></div>}
                  </div>
                );
              } else {
                const s   = done ? null : task.steps[currentIdx];
                const cat = done ? '' : (s.category || CATEGORY.NIGHT);
                const star = (!done && s.starred) ? <span class="cat-star step-cat-star">★</span> : null;
                stepsContent = (
                  <div class={`step-current${cat ? ` cat-${cat}` : ''}`}>
                    {done
                      ? <span class="step-done-label">✓ All steps complete!</span>
                      : <><input type="checkbox" onChange={() => advanceStep(ti)} />{star}<span class="step-current-text">{s.text}</span></>
                    }
                  </div>
                );
              }

              return (
                <li key={task.id}>
                  <div class="step-task-name">
                    <span class="step-name-left">
                      <button class="btn-expand" type="button" onClick={() => toggleExpand(task.id)} title="Expand steps">
                        {isExpanded ? '▼' : '▶'}
                      </button>
                      {task.name}
                    </span>
                    <span class="step-name-right">
                      <span class="step-progress">{progress}</span>
                      <button class="btn-edit" type="button" onClick={() => openEdit(ti)}>✎</button>
                      <button class="btn-del" type="button" onClick={() => deleteTask(ti)}>✕</button>
                    </span>
                  </div>
                  {stepsContent}
                </li>
              );
            })
        }
      </ul>

      {/* Edit modal — always rendered, hidden class toggled so tests can query it */}
      <div
        id="step-edit-modal"
        class={`modal-overlay${editIdx === null ? ' hidden' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) closeEdit(); }}
        onKeyDown={e => { if (e.key === 'Escape') closeEdit(); }}
      >
        <div class="modal step-edit-modal-inner">
          <h3 class="modal-title">Edit Step Task</h3>
          <div class="add-row">
            <input
              id="step-edit-name"
              ref={editNameRef}
              type="text"
              placeholder="Task name…"
              value={editName}
              onInput={e => setEditName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') closeEdit(); }}
            />
          </div>
          <StepFields idPrefix="step-edit-fields" steps={editSteps} onChange={changeEdit} onRemove={removeEdit} showDone={true} />
          <div class="step-add-steps step-add-actions">
            <button
              type="button"
              class="btn-add-step-field"
              onClick={() => setEditSteps(prev => [...prev, emptyStep()])}
            >+ Step</button>
            <button type="button" class="btn-modal-cancel" onClick={closeEdit}>Cancel</button>
            <button type="button" class="btn-confirm-task" onClick={saveEdit}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}
