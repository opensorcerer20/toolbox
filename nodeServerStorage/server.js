const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;
const DATA_FILE = path.join(__dirname, "values.log");
const DATA_JSON_FILE = path.join(__dirname, "data.json");

function writeLogLine(entry, callback) {
  const line = JSON.stringify(entry) + "\n";
  fs.appendFile(DATA_FILE, line, (err) => {
    if (err) console.error("Failed to write to values.log", err);
    if (callback) callback(err);
  });
}

function readJsonData(callback) {
  fs.readFile(DATA_JSON_FILE, "utf8", (err, contents) => {
    if (err) {
      if (err.code === "ENOENT") return callback(null, {});
      console.error("Failed to read data.json", err);
      return callback(err);
    }
    if (!contents.trim()) return callback(null, {});
    try {
      const parsed = JSON.parse(contents);
      callback(null, parsed && typeof parsed === "object" ? parsed : {});
    } catch (e) {
      console.error("Failed to parse data.json, resetting to empty object", e);
      callback(null, {});
    }
  });
}

function writeJsonData(data, callback) {
  const json = JSON.stringify(data, null, 2) + "\n";
  fs.writeFile(DATA_JSON_FILE, json, "utf8", (err) => {
    if (err) console.error("Failed to write data.json", err);
    if (callback) callback(err);
  });
}

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, POST");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(express.static(__dirname));

app.post("/storeValuePair", (req, res) => {
  const { name, value } = req.body || {};
  if (typeof name !== "string" || name.length === 0) {
    return res.status(400).json({ error: "Missing or invalid 'name' field" });
  }

  const entry = {
    timestamp: new Date().toISOString(),
    name,
    value,
  };

  writeLogLine(entry, (logErr) => {
    if (logErr) {
      return res.status(500).json({ error: "Failed to persist value" });
    }

    readJsonData((readErr, currentData) => {
      if (readErr) {
        return res.status(500).json({ error: "Failed to read JSON data" });
      }

      const updated = { ...(currentData || {}), [name]: value };

      writeJsonData(updated, (writeErr) => {
        if (writeErr) {
          return res.status(500).json({ error: "Failed to write JSON data" });
        }
        res.json({ ok: true });
      });
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log(`Appending detailed log entries to ${DATA_FILE}`);
  console.log(`Storing latest values in ${DATA_JSON_FILE}`);
});
