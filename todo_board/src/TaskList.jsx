import { useEffect, useState } from 'preact/hooks';
import { CATEGORY, stepTasks, subscribe, todos } from './store';

function getTaskItems(period) {
  const items = [
    ...todos
      .filter(t => !t.done)
      .map(t => ({ label: t.text, category: t.category || CATEGORY.DAY, starred: !!t.starred })),
    ...stepTasks
      .filter(t => t.steps.some(s => !s.done))
      .map(t => {
        const s = t.steps.find(s => !s.done);
        return { label: `${t.name}: ${s.text}`, category: s.category || CATEGORY.NIGHT, starred: !!s.starred };
      }),
  ];
  return items
    .filter(i => i.category === period)
    .sort((a, b) => b.starred - a.starred);
}

export default function TaskList({ period }) {
  const [, forceUpdate] = useState(0);
  useEffect(() => subscribe(() => forceUpdate(n => n + 1)), []);

  const items = getTaskItems(period);
  return (
    <div class="panel dn-subpanel">
      <h3>Tasks</h3>
      <ul class="cat-list">
        {items.length
          ? items.map(i => (
              <li key={i.label} class={`cat-${i.category}`}>
                {i.starred && <span class="cat-star">★</span>}
                {i.label}
              </li>
            ))
          : <li class="empty-msg">None.</li>
        }
      </ul>
    </div>
  );
}
