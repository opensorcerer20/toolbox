import { useEffect, useState } from 'preact/hooks';
import { CATEGORY, TASK_TYPE, todayStr, load, openEditModal, syncHabits, registerHabitsSetter } from './store';

const STORAGE_KEY = 'todoboard_habits';

export default function HabitPanel() {
  const [habits,      setHabits]   = useState(() => load(STORAGE_KEY, []));
  const [newName,     setNewName]  = useState('');
  const [newCategory, setNewCat]   = useState(CATEGORY.NIGHT);

  useEffect(() => {
    registerHabitsSetter(setHabits);
    return () => registerHabitsSetter(null);
  }, []);

  function persist(updated) {
    setHabits(updated);
    syncHabits(updated);
  }

  function addHabit() {
    const name = newName.trim();
    if (!name) return;
    persist([...habits, { id: Date.now(), name, logs: [], category: newCategory, starred: false }]);
    setNewName('');
  }

  function logHabit(i) {
    const today = todayStr();
    if (habits[i].logs.includes(today)) return;
    persist(habits.map((h, idx) => idx === i ? { ...h, logs: [...h.logs, today] } : h));
  }

  function deleteHabit(i) {
    persist(habits.filter((_, idx) => idx !== i));
  }

  const today = todayStr();

  return (
    <div class="panel">
      <h2>Daily Habits</h2>
      <div class="add-row">
        <input
          id="habit-input"
          type="text"
          placeholder="New habit…"
          value={newName}
          onInput={e => setNewName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') addHabit(); }}
        />
        <select
          id="habit-category"
          class="visibility-select"
          value={newCategory}
          onChange={e => setNewCat(e.target.value)}>
          <option value={CATEGORY.NIGHT}>Night</option>
          <option value={CATEGORY.DAY}>Day</option>
        </select>
        <button class="btn-add" onClick={addHabit}>Add</button>
      </div>
      <ul id="habit-list">
        {habits.length === 0
          ? <li class="empty-msg">No habits yet.</li>
          : habits.map((h, i) => {
              const loggedToday = h.logs.includes(today);
              return (
                <li key={h.id} class={`cat-${h.category}`}>
                  <span class="habit-name">{h.name}</span>
                  <span class="habit-count">{h.logs.length}×</span>
                  <button
                    class={`btn-habit-log${loggedToday ? ' done-today' : ''}`}
                    disabled={loggedToday}
                    onClick={loggedToday ? undefined : () => logHabit(i)}>
                    {loggedToday ? '✓ Done' : 'Log'}
                  </button>
                  <button class="btn-edit" onClick={() => openEditModal(TASK_TYPE.HABIT, i)}>✎</button>
                  <button class="btn-del" onClick={() => deleteHabit(i)}>✕</button>
                </li>
              );
            })
        }
      </ul>
    </div>
  );
}
