# Crazywall

A browser-based freeform corkboard for organizing notes and mapping relationships between ideas. No server, no account — everything lives in your browser's localStorage.

## Features

- **Sticky notes** — create draggable notes with a title and body text anywhere on an infinite canvas
- **Connections** — draw lines between notes to visualize relationships
- **Multiple boards** — organize separate topics on named boards, switch between them instantly
- **Collapse/expand** — minimize notes to just their title bar to reduce clutter
- **Import / Export** — save a board to JSON and reload it later, or move it to another browser
- **CSV bulk import** — seed a board from a spreadsheet using the provided template format

## Usage

Open `index.html` directly in a browser. No build step or server required.

### Notes

| Action | How |
|---|---|
| Add a note | Click **+ New note** in the toolbar |
| Move a note | Drag the grip icon on the left of the title bar |
| Edit title/body | Click directly into the note fields |
| Collapse a note | Click the chevron button in the title bar |
| Delete a note | Click **✕** in the title bar, then confirm |

### Connections

1. Click **Connect** in the toolbar (button turns amber).
2. Click the first note — it gets a gold highlight.
3. Click the second note — a dashed line appears between them.
4. Click **Connect** again or click the canvas background to exit connect mode.

To delete a connection: click its line to select it (turns orange), then press `Delete` or `Backspace`. Press `Escape` to deselect without deleting.

### Boards

- **New board** — prompts for a name and switches to an empty board.
- **Switch board** — use the **Selected Board** dropdown.
- **Rename board** — edit the name field in the **Title** bar and click **Save** (or press Enter).

### Export & Import

- **Export** (down-arrow icon) — downloads the active board as a `.json` file named `crazywall-<board>-<date>.json`.
- **Import** (up-arrow icon) — loads a previously exported `.json` file, appending its notes below any existing ones on the current board.

### CSV Bulk Import

Click **Input Template** to download a starter CSV. Fill it in with your nodes and their connections, convert to JSON matching the schema below, then import.

**CSV / JSON schema:**

```
id,node,connections
1,"first node","2,3"
2,"second node","1"
3,"third node","1"
```

Each row becomes a note. The `connections` column is a comma-separated list of other `id` values that node should be linked to. Duplicate edges are automatically deduplicated on import.

## Data Storage

All data is stored in `localStorage` under two keys:

| Key | Contents |
|---|---|
| `crazywall_boards` | JSON object mapping board names to their notes and connections |
| `crazywall_active_board` | The name of the last active board |

Data persists across page reloads but is browser- and origin-specific. Use Export/Import to back up or transfer boards.

## File Structure

```
crazywall/
├── index.html   # markup and toolbar
├── script.js    # all application logic
└── style.css    # layout and visual styling
```
