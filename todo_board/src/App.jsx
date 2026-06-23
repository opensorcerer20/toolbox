import { useEffect, useState } from 'preact/hooks';

import CategoryPanel from './CategoryPanel';
import EditModal from './EditModal';
import HabitPanel from './HabitPanel';
import StepPanel from './StepPanel';
import {
  downloadData,
  registerOpenEditModal,
  scheduleReloadAtMidnight,
} from './store';
import TabNav from './TabNav';
import TodoPanel from './TodoPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('todoboard_activeTab') || 'daynight'
  );
  const [editState, setEditState] = useState(null);

  const switchTab = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('todoboard_activeTab', tab);
  };

  useEffect(() => {
    registerOpenEditModal((type, index) => setEditState({ type, index }));
    scheduleReloadAtMidnight();
  }, []);

  return (
    <>
      <h1>To Do Board</h1>
      <button class="btn-download" onClick={downloadData}>Download JSON</button>
      <p class="tagline">"Take one small step forward today, that's it"</p>
      <p class="tagline">"Hurry up and post it"</p>
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
      <EditModal editState={editState} onClose={() => setEditState(null)} />
    </>
  );
}
