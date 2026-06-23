import { useEffect, useState } from 'preact/hooks';
import { CATEGORY, habits, subscribe, todayStr } from './store';

function getHabitItems(period) {
  const today = todayStr();
  return habits
    .filter(h => !h.logs.includes(today) && (h.category || CATEGORY.DAY) === period)
    .map(h => ({ label: h.name, category: h.category || CATEGORY.DAY, starred: !!h.starred }))
    .sort((a, b) => b.starred - a.starred);
}

export default function HabitList({ period }) {
  const [, forceUpdate] = useState(0);
  useEffect(() => subscribe(() => forceUpdate(n => n + 1)), []);

  const items = getHabitItems(period);
  return (
    <div class="panel dn-subpanel">
      <h3>Habits</h3>
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
