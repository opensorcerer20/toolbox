# To Do Board

A single-file productivity board with three sections: a to-do list, a daily habit tracker, and a step-by-step task list. All data is stored in `localStorage` — no server or build step required.

## Usage

Open `index.html` directly in a browser. No dependencies needed.

## Sections

**To-Do** — Add tasks, check them off, delete them. Each task is assigned a time-of-day category (Day or Night) to help prioritize when to tackle it.

**Daily Habits** — Track recurring habits. Each habit can be logged once per day; the button disables after logging and re-enables the next day. A running total shows how many days you've logged each habit.

**Step-by-Step** — Add tasks with ordered steps. Only the current step is shown until checked off, at which point the next step appears. Click the arrow to expand and see all steps — past steps are struck through, future steps are dimmed.

## Day / Night

Tasks and habits are categorized as **Day** or **Night** when added. This is a priority signal — Day items are things that should be done during daytime hours, while Night items are lower-priority tasks that can be deferred to the evening. The board displays each category in its own section so you can focus on what matters at the time of day you're working.

## Editing Tasks

Any task can be edited after it's been added. Click the edit (pencil) icon on a task to open the edit modal, where you can update the task's text and change its Day/Night category. Confirm with Save or dismiss with Cancel.

## Testing

Install dependencies and run the Playwright test suite:

```bash
npm install
npx playwright install chromium
npm test
```

To open the interactive Playwright UI:

```bash
npm run test:ui
```
