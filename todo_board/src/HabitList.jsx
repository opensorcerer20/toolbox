import { useEffect } from 'preact/hooks';
import { renderHabitColumn } from './store';

export default function HabitList({ period }) {
  useEffect(() => { renderHabitColumn(); }, []);
  return (
    <div class="panel dn-subpanel">
      <h3>Habits</h3>
      <ul id={`${period}-habit-list`} class="cat-list"></ul>
    </div>
  );
}
