import { useEffect } from 'preact/hooks';
import { renderCategoryColumn } from './store';

export default function CategoryPanel() {
  useEffect(() => { renderCategoryColumn(); }, []);
  return (
    <div class="panel category-panel">
      <div class="cat-section">
        <h2>Day</h2>
        <ul id="cat-day-list" class="cat-list"></ul>
      </div>
      <div class="cat-divider"></div>
      <div class="cat-section">
        <h2>Night</h2>
        <ul id="cat-night-list" class="cat-list"></ul>
      </div>
    </div>
  );
}
