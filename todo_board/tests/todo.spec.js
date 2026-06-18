const { test, expect } = require('@playwright/test');
const path = require('path');

const url = 'file://' + path.resolve(__dirname, '../index.html');

function freshPage(page) {
  return page.addInitScript(() => {
    localStorage.clear();
  });
}

async function addTodoAndOpenEdit(page, text) {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#todo-input', text);
  await page.click('.btn-add');
  await page.locator('#todo-list .btn-edit').click();
}

async function addHabitAndOpenEdit(page, text) {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#habit-input', text);
  await page.click('.btn-add >> nth=1');
  await page.locator('#habit-list .btn-edit').click();
}

// ─── To-Do ───────────────────────────────────────────────────────────────────

test('adds a todo item', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#todo-input', 'Buy milk');
  await page.click('.btn-add');
  await expect(page.locator('#todo-list')).toContainText('Buy milk');
});

test('checks off a todo item', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#todo-input', 'Walk dog');
  await page.click('.btn-add');
  await page.locator('#todo-list li input[type="checkbox"]').click();
  await expect(page.locator('#todo-list li.done')).toContainText('Walk dog');
});

test('deletes a todo item', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#todo-input', 'Delete me');
  await page.click('.btn-add');
  await page.locator('#todo-list li .btn-del').click();
  await expect(page.locator('#todo-list')).not.toContainText('Delete me');
});

test('persists todos in localStorage', async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.goto(url);
  await page.fill('#todo-input', 'Persisted task');
  await page.click('.btn-add');
  await page.goto(url);
  await expect(page.locator('#todo-list')).toContainText('Persisted task');
});

test('adds todo on Enter key', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#todo-input', 'Enter task');
  await page.press('#todo-input', 'Enter');
  await expect(page.locator('#todo-list')).toContainText('Enter task');
});

// ─── Habits ───────────────────────────────────────────────────────────────────

test('adds a habit', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#habit-input', 'Meditate');
  await page.click('.btn-add >> nth=1');
  await expect(page.locator('#habit-list')).toContainText('Meditate');
});

test('logs a habit and disables button for today', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#habit-input', 'Exercise');
  await page.click('.btn-add >> nth=1');
  await page.locator('#habit-list .btn-habit-log').click();
  const btn = page.locator('#habit-list .btn-habit-log');
  await expect(btn).toBeDisabled();
  await expect(btn).toContainText('✓ Done');
});

test('habit count increments on log', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#habit-input', 'Read');
  await page.click('.btn-add >> nth=1');
  await expect(page.locator('#habit-list .habit-count')).toContainText('0×');
  await page.locator('#habit-list .btn-habit-log').click();
  await expect(page.locator('#habit-list .habit-count')).toContainText('1×');
});

test('deletes a habit', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#habit-input', 'Stretch');
  await page.click('.btn-add >> nth=1');
  await page.locator('#habit-list .btn-del').click();
  await expect(page.locator('#habit-list')).not.toContainText('Stretch');
});

// ─── Step-by-step ─────────────────────────────────────────────────────────────

test('adds a step task and shows first step', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#step-task-input', 'Launch rocket');
  await page.locator('#step-fields input').fill('Fuel up');
  await page.click('.btn-add-step-field');
  await page.locator('#step-fields input >> nth=1').fill('Press launch');
  await page.click('.btn-confirm-task');
  await expect(page.locator('#step-list')).toContainText('Launch rocket');
  await expect(page.locator('#step-list')).toContainText('Fuel up');
  await expect(page.locator('#step-list')).not.toContainText('Press launch');
});

test('checking off current step advances to next', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#step-task-input', 'Cook dinner');
  await page.locator('#step-fields input').fill('Chop veggies');
  await page.click('.btn-add-step-field');
  await page.locator('#step-fields input >> nth=1').fill('Stir fry');
  await page.click('.btn-confirm-task');
  await page.locator('#step-list input[type="checkbox"]').click();
  await expect(page.locator('#step-list')).toContainText('Stir fry');
  await expect(page.locator('#step-list')).not.toContainText('Chop veggies');
});

test('completing all steps shows done label', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#step-task-input', 'One step task');
  await page.locator('#step-fields input').fill('Only step');
  await page.click('.btn-confirm-task');
  await page.locator('#step-list input[type="checkbox"]').click();
  await expect(page.locator('#step-list')).toContainText('All steps complete');
});

test('expand arrow shows all steps', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#step-task-input', 'Multi step');
  await page.locator('#step-fields input').fill('Step A');
  await page.click('.btn-add-step-field');
  await page.locator('#step-fields input >> nth=1').fill('Step B');
  await page.click('.btn-confirm-task');
  await page.locator('#step-list .btn-expand').click();
  await expect(page.locator('#step-list')).toContainText('Step A');
  await expect(page.locator('#step-list')).toContainText('Step B');
});

test('deletes a step task', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#step-task-input', 'Temp task');
  await page.locator('#step-fields input').fill('Some step');
  await page.click('.btn-confirm-task');
  await page.locator('#step-list .btn-del').click();
  await expect(page.locator('#step-list')).not.toContainText('Temp task');
});

// ─── Step-task edit modal ─────────────────────────────────────────────────────

async function addStepTaskAndOpenEdit(page, name, steps) {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#step-task-input', name);
  await page.locator('#step-fields input').fill(steps[0]);
  for (let i = 1; i < steps.length; i++) {
    await page.click('.btn-add-step-field');
    await page.locator(`#step-fields input >> nth=${i}`).fill(steps[i]);
  }
  await page.click('.btn-confirm-task');
  await page.locator('#step-list .btn-edit').click();
}

test('step edit modal opens with task name pre-filled', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'My task', ['Alpha']);
  await expect(page.locator('#step-edit-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#step-edit-name')).toHaveValue('My task');
});

test('step edit modal opens with steps pre-filled', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'Two stepper', ['First', 'Second']);
  await expect(page.locator('#step-edit-fields input >> nth=0')).toHaveValue('First');
  await expect(page.locator('#step-edit-fields input >> nth=1')).toHaveValue('Second');
});

test('step edit modal saves updated task name', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'Old name', ['A step']);
  await page.fill('#step-edit-name', 'New name');
  await page.click('#step-edit-modal .btn-confirm-task');
  await expect(page.locator('#step-list')).toContainText('New name');
  await expect(page.locator('#step-list')).not.toContainText('Old name');
  await expect(page.locator('#step-edit-modal')).toHaveClass(/hidden/);
});

test('step edit modal saves updated step text', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'My task', ['Old step']);
  await page.fill('#step-edit-fields input >> nth=0', 'New step');
  await page.click('#step-edit-modal .btn-confirm-task');
  await expect(page.locator('#step-list')).toContainText('New step');
});

test('step edit modal saves on Enter key in name field', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'Enter task', ['A step']);
  await page.fill('#step-edit-name', 'Saved via Enter');
  await page.press('#step-edit-name', 'Enter');
  await expect(page.locator('#step-list')).toContainText('Saved via Enter');
  await expect(page.locator('#step-edit-modal')).toHaveClass(/hidden/);
});

test('step edit modal cancel does not save changes', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'Keep name', ['A step']);
  await page.fill('#step-edit-name', 'Changed');
  await page.click('#step-edit-modal .btn-modal-cancel');
  await expect(page.locator('#step-list')).toContainText('Keep name');
  await expect(page.locator('#step-edit-modal')).toHaveClass(/hidden/);
});

test('step edit modal closes on Escape without saving', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'Escape task', ['A step']);
  await page.fill('#step-edit-name', 'Should not save');
  await page.press('#step-edit-name', 'Escape');
  await expect(page.locator('#step-edit-modal')).toHaveClass(/hidden/);
  await expect(page.locator('#step-list')).toContainText('Escape task');
});

test('step edit modal closes on backdrop click without saving', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'Backdrop task', ['A step']);
  await page.fill('#step-edit-name', 'Should not save');
  await page.locator('#step-edit-modal').click({ position: { x: 10, y: 10 } });
  await expect(page.locator('#step-edit-modal')).toHaveClass(/hidden/);
  await expect(page.locator('#step-list')).toContainText('Backdrop task');
});

test('step edit modal can add a new step', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'Growing task', ['First']);
  await page.click('#step-edit-modal .btn-add-step-field');
  await page.locator('#step-edit-fields input >> nth=1').fill('Second');
  await page.click('#step-edit-modal .btn-confirm-task');
  await page.locator('#step-list .btn-expand').click();
  await expect(page.locator('#step-list')).toContainText('First');
  await expect(page.locator('#step-list')).toContainText('Second');
});

test('step edit modal can remove a step', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'Shrink task', ['Keep', 'Remove']);
  await page.locator('#step-edit-fields .btn-del >> nth=1').click();
  await page.click('#step-edit-modal .btn-confirm-task');
  await page.locator('#step-list .btn-expand').click();
  await expect(page.locator('#step-list')).toContainText('Keep');
  await expect(page.locator('#step-list')).not.toContainText('Remove');
});

test('step edit preserves progress on name-only change', async ({ page }) => {
  await addStepTaskAndOpenEdit(page, 'Progress task', ['Step 1', 'Step 2']);
  // Close modal, advance past step 1, then edit name
  await page.click('#step-edit-modal .btn-modal-cancel');
  await page.locator('#step-list input[type="checkbox"]').click();
  await page.locator('#step-list .btn-edit').click();
  await page.fill('#step-edit-name', 'Renamed task');
  await page.click('#step-edit-modal .btn-confirm-task');
  // Should still show step 2 as current (progress preserved)
  await expect(page.locator('#step-list')).toContainText('Step 2');
  await expect(page.locator('#step-list')).not.toContainText('Step 1');
});

// ─── Edit Modal ───────────────────────────────────────────────────────────────

test('edit modal saves updated todo text', async ({ page }) => {
  await addTodoAndOpenEdit(page, 'Old task');
  await expect(page.locator('#edit-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#modal-input')).toHaveValue('Old task');
  await page.fill('#modal-input', 'New task');
  await page.click('.modal-actions .btn-add');
  await expect(page.locator('#todo-list')).toContainText('New task');
  await expect(page.locator('#todo-list')).not.toContainText('Old task');
  await expect(page.locator('#edit-modal')).toHaveClass(/hidden/);
});

test('edit modal saves on Enter key', async ({ page }) => {
  await addTodoAndOpenEdit(page, 'Press enter task');
  await page.fill('#modal-input', 'Saved via Enter');
  await page.press('#modal-input', 'Enter');
  await expect(page.locator('#todo-list')).toContainText('Saved via Enter');
  await expect(page.locator('#edit-modal')).toHaveClass(/hidden/);
});

test('edit modal cancel does not save todo changes', async ({ page }) => {
  await addTodoAndOpenEdit(page, 'Keep this');
  await page.fill('#modal-input', 'Changed text');
  await page.click('.btn-modal-cancel');
  await expect(page.locator('#todo-list')).toContainText('Keep this');
  await expect(page.locator('#edit-modal')).toHaveClass(/hidden/);
});

test('edit modal closes on Escape without saving', async ({ page }) => {
  await addTodoAndOpenEdit(page, 'Escape test');
  await page.fill('#modal-input', 'Should not save');
  await page.press('#modal-input', 'Escape');
  await expect(page.locator('#edit-modal')).toHaveClass(/hidden/);
  await expect(page.locator('#todo-list')).toContainText('Escape test');
  await expect(page.locator('#todo-list')).not.toContainText('Should not save');
});

test('edit modal closes on backdrop click without saving', async ({ page }) => {
  await addTodoAndOpenEdit(page, 'Backdrop test');
  await page.fill('#modal-input', 'Should not save');
  await page.locator('#edit-modal').click({ position: { x: 10, y: 10 } });
  await expect(page.locator('#edit-modal')).toHaveClass(/hidden/);
  await expect(page.locator('#todo-list')).toContainText('Backdrop test');
});

test('edit modal updates todo category', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#todo-input', 'Switch task');
  await page.selectOption('#todo-category', 'night');
  await page.click('.btn-add');
  await page.locator('#todo-list .btn-edit').click();
  await expect(page.locator('#modal-category')).toHaveValue('night');
  await page.selectOption('#modal-category', 'day');
  await page.click('.modal-actions .btn-add');
  await expect(page.locator('#todo-list li')).toHaveClass(/cat-day/);
});

test('edit modal saves updated habit name', async ({ page }) => {
  await addHabitAndOpenEdit(page, 'Old habit');
  await expect(page.locator('#edit-modal')).not.toHaveClass(/hidden/);
  await expect(page.locator('#modal-input')).toHaveValue('Old habit');
  await page.fill('#modal-input', 'New habit');
  await page.click('.modal-actions .btn-add');
  await expect(page.locator('#habit-list')).toContainText('New habit');
  await expect(page.locator('#habit-list')).not.toContainText('Old habit');
});

test('edit modal updates habit category', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.fill('#habit-input', 'Switch habit');
  await page.selectOption('#habit-category', 'night');
  await page.click('.btn-add >> nth=1');
  await page.locator('#habit-list .btn-edit').click();
  await page.selectOption('#modal-category', 'day');
  await page.click('.modal-actions .btn-add');
  await expect(page.locator('#habit-list li')).toHaveClass(/cat-day/);
});

// ─── Day/Night column removal ─────────────────────────────────────────────────

test('completing a day todo removes it from the day list', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.selectOption('#todo-category', 'day');
  await page.fill('#todo-input', 'Day errand');
  await page.click('.btn-add');
  await expect(page.locator('#cat-day-list')).toContainText('Day errand');
  await page.locator('#todo-list li input[type="checkbox"]').click();
  await expect(page.locator('#cat-day-list')).not.toContainText('Day errand');
});

test('completing a night todo removes it from the night list', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.selectOption('#todo-category', 'night');
  await page.fill('#todo-input', 'Night task');
  await page.click('.btn-add');
  await expect(page.locator('#cat-night-list')).toContainText('Night task');
  await page.locator('#todo-list li input[type="checkbox"]').click();
  await expect(page.locator('#cat-night-list')).not.toContainText('Night task');
});

test('logging a day habit removes it from the day list', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.selectOption('#habit-category', 'day');
  await page.fill('#habit-input', 'Morning run');
  await page.click('.btn-add >> nth=1');
  await expect(page.locator('#cat-day-list')).toContainText('Morning run');
  await page.locator('#habit-list .btn-habit-log').click();
  await expect(page.locator('#cat-day-list')).not.toContainText('Morning run');
});

test('logging a night habit removes it from the night list', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.selectOption('#habit-category', 'night');
  await page.fill('#habit-input', 'Evening read');
  await page.click('.btn-add >> nth=1');
  await expect(page.locator('#cat-night-list')).toContainText('Evening read');
  await page.locator('#habit-list .btn-habit-log').click();
  await expect(page.locator('#cat-night-list')).not.toContainText('Evening read');
});

test('unchecking a todo restores it to the day/night list', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.selectOption('#todo-category', 'day');
  await page.fill('#todo-input', 'Restore me');
  await page.click('.btn-add');
  await page.locator('#todo-list li input[type="checkbox"]').click();
  await expect(page.locator('#cat-day-list')).not.toContainText('Restore me');
  await page.locator('#todo-list li input[type="checkbox"]').click();
  await expect(page.locator('#cat-day-list')).toContainText('Restore me');
});

// ─── Stars ────────────────────────────────────────────────────────────────────

test('edit modal star defaults to unstarred', async ({ page }) => {
  await addTodoAndOpenEdit(page, 'Plain task');
  await expect(page.locator('#modal-star')).toHaveText('☆');
  await expect(page.locator('#modal-star')).not.toHaveClass(/starred/);
});

test('starred todo persists after save and modal reopen', async ({ page }) => {
  await addTodoAndOpenEdit(page, 'Persistent star');
  await page.click('#modal-star');
  await page.click('.modal-actions .btn-add');
  await page.locator('#todo-list .btn-edit').click();
  await expect(page.locator('#modal-star')).toHaveText('★');
  await expect(page.locator('#modal-star')).toHaveClass(/starred/);
});

test('starred todo appears first in day column and shows star icon', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.selectOption('#todo-category', 'day');
  await page.fill('#todo-input', 'First added');
  await page.click('.btn-add');
  await page.fill('#todo-input', 'Star this one');
  await page.click('.btn-add');
  await page.locator('#todo-list .btn-edit').nth(1).click();
  await page.click('#modal-star');
  await page.click('.modal-actions .btn-add');
  await expect(page.locator('#cat-day-list li').nth(0)).toContainText('Star this one');
  await expect(page.locator('#cat-day-list li').nth(1)).toContainText('First added');
  await expect(page.locator('#cat-day-list li .cat-star')).toHaveText('★');
});

test('starred habit appears first in night column and shows star icon', async ({ page }) => {
  await freshPage(page);
  await page.goto(url);
  await page.selectOption('#habit-category', 'night');
  await page.fill('#habit-input', 'First habit');
  await page.click('.btn-add >> nth=1');
  await page.fill('#habit-input', 'Star this habit');
  await page.click('.btn-add >> nth=1');
  await page.locator('#habit-list .btn-edit').nth(1).click();
  await page.click('#modal-star');
  await page.click('.modal-actions .btn-add');
  await expect(page.locator('#cat-night-list li').nth(0)).toContainText('Star this habit');
  await expect(page.locator('#cat-night-list li').nth(1)).toContainText('First habit');
  await expect(page.locator('#cat-night-list li .cat-star')).toHaveText('★');
});
