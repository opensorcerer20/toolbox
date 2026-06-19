export default function TodoPanel() {
  return (
    <div class="panel">
      <h2>To-Do</h2>
      <div class="add-row">
        <input id="todo-input" type="text" placeholder="New task…" />
        <select id="todo-category" class="visibility-select">
          <option value="night">Night</option>
          <option value="day">Day</option>
        </select>
        <button class="btn-add" onClick={() => window.addTodo()}>Add</button>
      </div>
      <ul id="todo-list"></ul>
    </div>
  );
}
