import { useEffect, useState } from 'preact/hooks';
import TabNav from './TabNav';
import CategoryPanel from './CategoryPanel';
import TodoPanel from './TodoPanel';
import HabitPanel from './HabitPanel';
import StepPanel from './StepPanel';
import {
  migrate, renderTodos, renderHabits, initStepAddForm, renderStepTasks,
  addTodo, addHabit, saveEdit, closeEditModal, closeStepEditModal,
  scheduleReloadAtMidnight,
} from './store';

export default function App() {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('todoboard_activeTab') || 'daynight'
  );

  const switchTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('todoboard_activeTab', tab);
  };

  useEffect(() => {
    migrate();
    renderTodos();
    renderHabits();
    initStepAddForm();
    renderStepTasks();

    document.getElementById('todo-input').addEventListener('keydown', e => { if (e.key === 'Enter') addTodo(); });
    document.getElementById('habit-input').addEventListener('keydown', e => { if (e.key === 'Enter') addHabit(); });
    document.getElementById('modal-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') saveEdit();
      if (e.key === 'Escape') closeEditModal();
    });
    document.getElementById('step-edit-modal').addEventListener('keydown', e => {
      if (e.key === 'Escape') closeStepEditModal();
    });

    scheduleReloadAtMidnight();
  }, []);

  return (
    <>
      <h1>To Do Board</h1>
      <button class="btn-download" onClick={() => window.downloadData()}>Download JSON</button>
      <p class="tagline">"Take one small step forward today, that's it"</p>
      <TabNav activeTab={activeTab} onSwitch={switchTab} />
      <div class={`tab-panel${activeTab === 'daynight' ? ' active' : ''}`}>
        <CategoryPanel />
      </div>
      <div class={`tab-panel${activeTab === 'todo' ? ' active' : ''}`}>
        <TodoPanel />
      </div>
      <div class={`tab-panel${activeTab === 'habits' ? ' active' : ''}`}>
        <HabitPanel />
      </div>
      <div class={`tab-panel${activeTab === 'steps' ? ' active' : ''}`}>
        <StepPanel />
      </div>
    </>
  );
}
