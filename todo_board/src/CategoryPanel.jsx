import TaskList from './TaskList';
import HabitList from './HabitList';

export default function CategoryPanel() {
  return (
    <div class="daynight-grid">
      <section class="daynight-section">
        <h2 class="daynight-heading">Day</h2>
        <div class="daynight-row">
          <TaskList period="day" />
          <HabitList period="day" />
        </div>
      </section>
      <section class="daynight-section">
        <h2 class="daynight-heading">Night</h2>
        <div class="daynight-row">
          <TaskList period="night" />
          <HabitList period="night" />
        </div>
      </section>
    </div>
  );
}
