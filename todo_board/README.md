# To Do Board

A single-file productivity board with three sections: a to-do list, a daily habit tracker, and a step-by-step task list. All data is stored in `localStorage` — no server or build step required.

## Usage

Open `index.html` directly in a browser. No dependencies needed.

## Sections

**To-Do** — Add tasks, check them off, delete them.

**Daily Habits** — Track recurring habits. Each habit can be logged once per day; the button disables after logging and re-enables the next day. A running total shows how many days you've logged each habit.

**Step-by-Step** — Add tasks with ordered steps. Only the current step is shown until checked off, at which point the next step appears. Click the arrow to expand and see all steps — past steps are struck through, future steps are dimmed.

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
