## Node Value Storage Demo

This project contains a tiny Node server and a simple browser page for storing arbitrary `{ name, value }` pairs.

The server exposes a single endpoint, `POST /storeValuePair`, and persists incoming data in two files:

- `values.log` – every request as one JSON line (with a timestamp).
- `data.json` – a JSON object containing the latest value for each `name`.

The UI in `index.html` is intentionally minimal and exists only as a demo client for the server.

### Running the demo

From this directory:

```bash
npm install
npm run start
```

The `start` script serves the current directory so you can open `index.html` in your browser.

In another terminal, start the Node logging server:

```bash
npm run server
```

This starts the server on `http://localhost:4000` with a `POST /storeValuePair` endpoint. The demo page posts `{ name, value }` pairs to that endpoint when you submit the form.

