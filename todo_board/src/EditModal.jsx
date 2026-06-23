import { useEffect, useRef, useState } from 'preact/hooks';
import { CATEGORY, habits, syncHabits, syncTodos, TASK_TYPE, todos } from './store';

export default function EditModal({ editState, onClose }) {
  const [text,     setText]     = useState('');
  const [category, setCategory] = useState(CATEGORY.NIGHT);
  const [logWhen,  setLogWhen]  = useState('today');
  const [starred,  setStarred]  = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!editState) return;
    const { type, index } = editState;
    const item = type === TASK_TYPE.TODO ? todos[index] : habits[index];
    setText(type === TASK_TYPE.TODO ? item.text : item.name);
    setCategory(item.category || CATEGORY.NIGHT);
    setStarred(!!item.starred);
    setLogWhen(item.logWhen || 'today');
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
  }, [editState]);

  function handleSave() {
    if (!editState || !text.trim()) return;
    const { type, index } = editState;
    if (type === TASK_TYPE.TODO) {
      syncTodos(todos.map((t, i) => i === index ? { ...t, text: text.trim(), category, starred } : t));
    } else {
      syncHabits(habits.map((h, i) => i === index ? { ...h, name: text.trim(), category, logWhen, starred } : h));
    }
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  }

  if (!editState) return null;

  return (
    <div class="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div class="modal">
        <h3 class="modal-title">Edit</h3>
        <input ref={inputRef} type="text" value={text} onInput={e => setText(e.target.value)} onKeyDown={handleKeyDown} />
        <div>
          <select class="visibility-select modal-category-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value={CATEGORY.NIGHT}>Night</option>
            <option value={CATEGORY.DAY}>Day</option>
          </select>
        </div>
        {editState.type === TASK_TYPE.HABIT && (
          <div>
            <select class="visibility-select" value={logWhen} onChange={e => setLogWhen(e.target.value)}>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
            </select>
          </div>
        )}
        <div class="modal-star-row">
          <span class="modal-star-label">Starred</span>
          <button class={`btn-star${starred ? ' starred' : ''}`} onClick={() => setStarred(s => !s)}>
            {starred ? '★' : '☆'}
          </button>
        </div>
        <div class="modal-actions">
          <button class="btn-modal-cancel" onClick={onClose}>Cancel</button>
          <button class="btn-add" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
