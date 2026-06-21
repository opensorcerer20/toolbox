import { useEffect } from 'preact/hooks';
import { renderTaskColumn } from './store';

export default function TaskList({ period }) {
  useEffect(() => { renderTaskColumn(); }, []);
  return (
    <div class="panel dn-subpanel">
      <h3>Tasks</h3>
      <ul id={`${period}-task-list`} class="cat-list"></ul>
    </div>
  );
}
