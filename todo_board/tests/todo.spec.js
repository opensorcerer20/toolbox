const { test, expect } = require('@playwright/test');
const path = require('path');

const url = 'file://' + path.resolve(__dirname, '../index.html');

function freshPage(page) {
  return page.addInitScript(() => {
    localStorage.clear();
  });
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
