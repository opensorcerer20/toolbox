import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'fs';

// Playwright creates a fresh browser context (and thus empty storage) per test.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.waitForSelector('.app-title');
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createNotebook(page: Page, name: string, fields: { name: string; type: string }[]) {
  await page.getByRole('button', { name: '+ New Notebook' }).click();
  await page.getByPlaceholder("e.g. Books I've Read").fill(name);

  for (const field of fields) {
    await page.getByRole('button', { name: '+ Add Field' }).click();
    const inputs = page.locator('.field-name-input');
    await inputs.last().fill(field.name);
    const selects = page.locator('.select-type');
    await selects.last().selectOption(field.type);
  }

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(name)).toBeVisible();
}

async function openNotebook(page: Page, name: string) {
  await page.locator('.collection-card').filter({ hasText: name }).click();
  await expect(page.locator('.page-title')).toHaveText(name);
}

async function addNote(page: Page, data: Record<string, string>) {
  await page.getByRole('button', { name: '+ New Note' }).click();
  for (const [label, value] of Object.entries(data)) {
    const fieldLabel = page.locator('.field-label', { hasText: label });
    const block = fieldLabel.locator('..');
    const input = block.locator('input, textarea, select').first();
    const tagName = await input.evaluate(el => el.tagName.toLowerCase());
    if (tagName === 'select') {
      await input.selectOption(value);
    } else {
      await input.fill(value);
    }
  }
  await page.getByRole('button', { name: 'Save Note' }).click();
  // Return to note list after saving
  await page.getByRole('button', { name: '← Back' }).click();
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test('home screen shows empty state and app title', async ({ page }) => {
  await expect(page.locator('.app-title')).toHaveText('Field Notes');
  await expect(page.getByText('No notebooks yet.')).toBeVisible();
});

test('create a notebook and see it on home screen', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  await expect(page.locator('.collection-card')).toHaveCount(1);
  await expect(page.locator('.card-name')).toHaveText('Reading Log');
  await expect(page.locator('.card-meta')).toHaveText('1 field');
});

test('open a notebook and see empty note list', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  await openNotebook(page, 'Reading Log');
  await expect(page.getByText('No notes yet.')).toBeVisible();
});

test('add a note and see it in the list', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [
    { name: 'Title', type: 'text' },
    { name: 'Author', type: 'text' },
  ]);
  await openNotebook(page, 'Reading Log');
  await addNote(page, { Title: 'Dune', Author: 'Herbert' });
  await expect(page.locator('.note-card')).toHaveCount(1);
  await expect(page.locator('.note-title')).toHaveText('Dune');
});

test('note title in list uses first field value', async ({ page }) => {
  await createNotebook(page, 'Log', [
    { name: 'Entry', type: 'text' },
    { name: 'Notes', type: 'textarea' },
  ]);
  await openNotebook(page, 'Log');
  await addNote(page, { Entry: 'My first entry', Notes: 'Some detail' });
  await expect(page.locator('.note-title')).toHaveText('My first entry');
});

test('open a note and see all field values', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [
    { name: 'Title', type: 'text' },
    { name: 'Author', type: 'text' },
  ]);
  await openNotebook(page, 'Reading Log');
  await addNote(page, { Title: 'Dune', Author: 'Frank Herbert' });
  await page.locator('.note-card').click();
  await expect(page.locator('.note-body')).toContainText('Dune');
  await expect(page.locator('.note-body')).toContainText('Frank Herbert');
});

test('edit a note and see updated value in list', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  await openNotebook(page, 'Reading Log');
  await addNote(page, { Title: 'Dune' });
  await page.locator('.note-card').click();
  await page.getByRole('button', { name: /Edit/ }).click();
  const input = page.locator('input[type="text"]').first();
  await input.fill('Dune Messiah');
  await page.getByRole('button', { name: 'Save Note' }).click();
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.locator('.note-title')).toHaveText('Dune Messiah');
});

test('delete a note removes it from the list', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  await openNotebook(page, 'Reading Log');
  await addNote(page, { Title: 'Dune' });
  await page.locator('.note-card').click();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Delete' }).click();
  await expect(page.locator('.note-card')).toHaveCount(0);
  await expect(page.getByText('No notes yet.')).toBeVisible();
});

test('delete a notebook removes it from home screen', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  page.once('dialog', d => d.accept());
  await page.locator('.btn-danger').click();
  await expect(page.locator('.collection-card')).toHaveCount(0);
  await expect(page.getByText('No notebooks yet.')).toBeVisible();
});

test('data persists across page reload', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  await openNotebook(page, 'Reading Log');
  await addNote(page, { Title: 'Dune' });
  await page.reload();
  await page.waitForSelector('.collection-card');
  await openNotebook(page, 'Reading Log');
  await expect(page.locator('.note-title')).toHaveText('Dune');
});

test('edit notebook schema adds a new field', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  await openNotebook(page, 'Reading Log');
  await page.locator('[data-testid="schema-btn"]').click();
  await page.locator('[data-testid="schema-modal"]').waitFor();
  await page.locator('button', { hasText: '+ Add Field' }).click();
  const inputs = page.locator('.field-name-input');
  await inputs.last().fill('Rating');
  await page.locator('.select-type').last().selectOption('number');
  await page.locator('[data-testid="schema-modal"] button', { hasText: 'Save' }).click();

  await page.getByRole('button', { name: '+ New Note' }).click();
  await expect(page.locator('.field-label', { hasText: 'Rating' })).toBeVisible();
});

test('existing notes survive schema field addition', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  await openNotebook(page, 'Reading Log');
  await addNote(page, { Title: 'Dune' });

  await page.locator('[data-testid="schema-btn"]').click();
  await page.locator('[data-testid="schema-modal"]').waitFor();
  await page.locator('button', { hasText: '+ Add Field' }).click();
  await page.locator('.field-name-input').last().fill('Year');
  await page.locator('[data-testid="schema-modal"] button', { hasText: 'Save' }).click();

  await page.locator('.note-card').click();
  await expect(page.locator('.note-body')).toContainText('Dune');
  await expect(page.locator('.field-label', { hasText: 'Year' })).toBeVisible();
});

test('export CSV triggers download with correct content', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  await openNotebook(page, 'Reading Log');
  await addNote(page, { Title: 'Dune' });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export/ }).click().then(async () => {
      await page.getByRole('button', { name: 'Download CSV' }).click();
    }),
  ]);

  expect(download.suggestedFilename()).toBe('Reading Log.csv');
  const path = await download.path();
  const content = readFileSync(path!, 'utf8');
  expect(content).toContain('Title');
  expect(content).toContain('Dune');
});

test('export JSON triggers download with correct structure', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  await openNotebook(page, 'Reading Log');
  await addNote(page, { Title: 'Dune' });

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: /Export/ }).click().then(async () => {
      await page.getByRole('button', { name: 'Download JSON' }).click();
    }),
  ]);

  expect(download.suggestedFilename()).toBe('Reading Log.json');
  const path = await download.path();
  const records = JSON.parse(readFileSync(path!, 'utf8'));
  expect(Array.isArray(records)).toBe(true);
  expect(records[0].Title).toBe('Dune');
  expect(records[0]._id).toBeDefined();
  expect(records[0]._createdAt).toBeDefined();
});

test('select field type shows dropdown options in note form', async ({ page }) => {
  await createNotebook(page, 'Mood Log', [{ name: 'Mood', type: 'select' }]);
  await openNotebook(page, 'Mood Log');
  await page.locator('[data-testid="schema-btn"]').click();
  await page.locator('[data-testid="schema-modal"]').waitFor();
  await page.locator('button', { hasText: '+ Add Option' }).click();
  await page.locator('.option-row input').last().fill('Happy');
  await page.locator('button', { hasText: '+ Add Option' }).click();
  await page.locator('.option-row input').last().fill('Sad');
  await page.locator('[data-testid="schema-modal"] button', { hasText: 'Save' }).click();

  await page.getByRole('button', { name: '+ New Note' }).click();
  const select = page.locator('select.input');
  await expect(select).toBeVisible();
  await select.selectOption('Happy');
  await page.getByRole('button', { name: 'Save Note' }).click();
  await page.getByRole('button', { name: '← Back' }).click();

  await page.locator('.note-card').click();
  await expect(page.locator('.note-body')).toContainText('Happy');
});

test('multiple notebooks are independent', async ({ page }) => {
  await createNotebook(page, 'Books', [{ name: 'Title', type: 'text' }]);
  await createNotebook(page, 'Films', [{ name: 'Name', type: 'text' }]);
  await expect(page.locator('.collection-card')).toHaveCount(2);

  await openNotebook(page, 'Books');
  await addNote(page, { Title: 'Dune' });
  await page.getByRole('button', { name: '← Back' }).click();

  await openNotebook(page, 'Films');
  await expect(page.locator('.note-card')).toHaveCount(0);
});

test('back button returns to correct screen', async ({ page }) => {
  await createNotebook(page, 'Reading Log', [{ name: 'Title', type: 'text' }]);
  await openNotebook(page, 'Reading Log');
  await addNote(page, { Title: 'Dune' });
  await page.locator('.note-card').click();

  // Back from detail → note list
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.locator('.note-card')).toBeVisible();

  // Back from note list → home
  await page.getByRole('button', { name: '← Back' }).click();
  await expect(page.locator('.app-title')).toHaveText('Field Notes');
});
