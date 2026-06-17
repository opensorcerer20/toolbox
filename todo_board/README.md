# To Do Board

> *"Take one small step forward today, that's it."*

Built for people who struggle to break tasks down into smaller pieces and actually act on them. The board keeps everything visible at a glance — what needs to happen today, what's a daily commitment, and what the very next step is on a bigger project. Tasks are split into Day and Night so time-sensitive errands that can only be done during business hours are separated from personal or leisure items best saved for the evening. The only real discipline required is making sure larger tasks are broken down appropriately before they go on the board.

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

## Starring

Todos and daily habits can be starred from the edit modal. Click the star icon (☆) to toggle it yellow (★). Starred items are sorted to the top of their Day or Night column in the overview and shown with a star icon to make them easy to spot.

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
