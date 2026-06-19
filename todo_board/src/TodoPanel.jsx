import { useEffect, useState } from 'preact/hooks';
import { CATEGORY, TASK_TYPE, todayStr, load, openEditModal, syncTodos, registerTodosSetter } from './store';

const STORAGE_KEY = 'todoboard_todos';

export default function TodoPanel() {
  const [todos,       setTodos]   = useState(() => load(STORAGE_KEY, []));
  const [newName,     setNewName] = useState('');
  const [newCategory, setNewCat]  = useState(CATEGORY.NIGHT);

  useEffect(() => {
    registerTodosSetter(setTodos);
    return () => registerTodosSetter(null);
  }, []);

  function persist(updated) {
    setTodos(updated);
    syncTodos(updated);
  }

  function addTodo() {
    const text = newName.trim();
    if (!text) return;
    persist([...todos, { id: Date.now(), text, done: false, completedOn: null, category: newCategory, starred: false }]);
    setNewName('');
  }

  function toggleTodo(i) {
    persist(todos.map((t, idx) => {
      if (idx !== i) return t;
      const done = !t.done;
      return { ...t, done, completedOn: done ? todayStr() : null };
    }));
  }

  function deleteTodo(i) {
    persist(todos.filter((_, idx) => idx !== i));
  }

  const today = todayStr();
  const visible = todos
    .map((t, i) => ({ ...t, _idx: i }))
    .filter(t => !t.completedOn || t.completedOn >= today)
    .sort((a, b) => a.done - b.done);

  return (
    <div class="panel">
      <h2>To-Do</h2>
      <div class="add-row">
        <input
          id="todo-input"
          type="text"
          placeholder="New task…"
          value={newName}
          onInput={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addTodo(); }}
        />
        <select
          id="todo-category"
          class="visibility-select"
          value={newCategory}
          onChange={e => setNewCat(e.target.value)}>
          <option value={CATEGORY.NIGHT}>Night</option>
          <option value={CATEGORY.DAY}>Day</option>
        </select>
        <button class="btn-add" onClick={addTodo}>Add</button>
      </div>
      <ul id="todo-list">
        {visible.length === 0
          ? <li class="empty-msg">No tasks yet.</li>
          : visible.map(t => (
              <li key={t.id} class={`${t.done ? 'done ' : ''}cat-${t.category}`}>
                <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t._idx)} />
                <span class="todo-text">{t.text}</span>
                <button class="btn-edit" onClick={() => openEditModal(TASK_TYPE.TODO, t._idx)}>✎</button>
                <button class="btn-del" onClick={() => deleteTodo(t._idx)}>✕</button>
              </li>
            ))
        }
      </ul>
    </div>
  );
}
