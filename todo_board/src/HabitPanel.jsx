export default function HabitPanel() {
  return (
    <div class="panel">
      <h2>Daily Habits</h2>
      <div class="add-row">
        <input id="habit-input" type="text" placeholder="New habit…" />
        <select id="habit-category" class="visibility-select">
          <option value="night">Night</option>
          <option value="day">Day</option>
        </select>
        <button class="btn-add" onClick={() => window.addHabit()}>Add</button>
      </div>
      <ul id="habit-list"></ul>
    </div>
  );
}
