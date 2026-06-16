const { defineConfig } = require('@playwright/test');
const path = require('path');

module.exports = defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'file://' + path.resolve(__dirname, 'index.html'),
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
