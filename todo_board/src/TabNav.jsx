const TABS = [
  { id: 'daynight', label: 'Day / Night' },
  { id: 'todo',     label: 'To-Do' },
  { id: 'habits',   label: 'Habits' },
  { id: 'steps',    label: 'Step Tasks' },
];

export default function TabNav({ activeTab, onSwitch }) {
  return (
    <nav class="tab-nav">
      {TABS.map(t => (
        <button
          key={t.id}
          class={`tab-btn${activeTab === t.id ? ' active' : ''}`}
          onClick={() => onSwitch(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
