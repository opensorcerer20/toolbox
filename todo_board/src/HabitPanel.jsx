import {
  useEffect,
  useState,
} from 'preact/hooks';

import {
  CATEGORY,
  load,
  openEditModal,
  registerHabitsSetter,
  syncHabits,
  TASK_TYPE,
  todayStr,
  yesterdayStr,
} from './store';

const STORAGE_KEY = 'todoboard_habits';

export default function HabitPanel() {
  const [habits,      setHabits]   = useState(() => load(STORAGE_KEY, []));
  const [newName,     setNewName]  = useState('');
  const [newCategory, setNewCat]   = useState(CATEGORY.NIGHT);
  const [newLogWhen,  setNewLogWhen] = useState('today');

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
    persist([...habits, { id: Date.now(), name, logs: [], category: newCategory, logWhen: newLogWhen, starred: false }]);
    setNewName('');
  }

  function logHabit(i) {
    const dateStr = habits[i].logWhen === 'yesterday' ? yesterdayStr() : todayStr();
    if (habits[i].logs.includes(dateStr)) return;
    persist(habits.map((h, idx) => idx === i ? { ...h, logs: [...h.logs, dateStr] } : h));
  }

  function deleteHabit(i) {
    persist(habits.filter((_, idx) => idx !== i));
  }

  const today     = todayStr();
  const yesterday = yesterdayStr();

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
        <select
          id="habit-logwhen"
          class="visibility-select"
          value={newLogWhen}
          onChange={e => setNewLogWhen(e.target.value)}>
          <option value="today">Today</option>
          <option value="yesterday">Yesterday</option>
        </select>
        <button class="btn-add" onClick={addHabit}>Add</button>
      </div>
      <ul id="habit-list">
        {habits.length === 0
          ? <li class="empty-msg">No habits yet.</li>
          : habits.map((h, i) => {
              const isYesterday  = h.logWhen === 'yesterday';
              const logDateStr   = isYesterday ? yesterday : today;
              const logged       = h.logs.includes(logDateStr);
              return (
                <li key={h.id} class={`cat-${h.category}`}>
                  <span class="habit-name">{h.name}</span>
                  <span class="habit-count">{h.logs.length}×</span>
                  <button
                    class={`btn-habit-log${logged ? ' done-today' : ''}`}
                    disabled={logged}
                    onClick={logged ? undefined : () => logHabit(i)}>
                    {isYesterday ? 'Y-Log' : 'Log'}
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
