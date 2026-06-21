import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';
import { isOPFSAvailable, restoreFromOPFS } from './backup';

// Option A: request persistent storage so the OS won't evict IndexedDB
if (navigator.storage?.persist) {
  navigator.storage.persist();
}

// Option B: restore from OPFS shadow backup if IndexedDB was evicted
if (isOPFSAvailable()) {
  await restoreFromOPFS();
}

mount(App, { target: document.getElementById('app')! });
