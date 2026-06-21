<script lang="ts">
  import { onMount } from 'svelte';
  import { getCollection, putCollection, getEntries } from '../db';
  import { downloadCSV, downloadJSON } from '../export';
  import type { Collection, Entry } from '../types';
  import SchemaEditor from './SchemaEditor.svelte';

  let {
    collectionId,
    onback,
    onnote,
    onnew,
  }: {
    collectionId: string;
    onback: () => void;
    onnote: (entryId: string) => void;
    onnew: () => void;
  } = $props();

  let collection = $state<Collection | null>(null);
  let entries = $state<Entry[]>([]);
  let showEditor = $state(false);
  let showExportMenu = $state(false);

  onMount(load);

  async function load() {
    collection = (await getCollection(collectionId)) ?? null;
    if (collection) {
      entries = await getEntries(collectionId);
      entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }

  async function handleSchemaSave(updated: Collection) {
    await putCollection(updated);
    collection = updated;
    showEditor = false;
  }

  function noteTitle(entry: Entry): string {
    if (!collection || collection.fields.length === 0) return 'Untitled';
    const firstField = collection.fields[0];
    const val = entry.data[firstField.id];
    return val != null && String(val).trim() !== '' ? String(val) : 'Untitled';
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function exportCSV() {
    if (collection) downloadCSV(collection, entries);
    showExportMenu = false;
  }

  function exportJSON() {
    if (collection) downloadJSON(collection, entries);
    showExportMenu = false;
  }
</script>

<div class="screen">
  <header class="topbar">
    <button class="btn-back" onclick={onback}>← Back</button>
    <h1 class="page-title">{collection?.name ?? '…'}</h1>
    <div class="topbar-actions">
      <button class="btn-icon-label" data-testid="schema-btn" onclick={() => { showEditor = true; }}>✎ Schema</button>
      <div class="export-wrapper">
        <button class="btn-icon-label" onclick={() => { showExportMenu = !showExportMenu; }}>↓ Export</button>
        {#if showExportMenu}
          <div class="export-menu">
            <button onclick={exportCSV}>Download CSV</button>
            <button onclick={exportJSON}>Download JSON</button>
          </div>
        {/if}
      </div>
    </div>
  </header>

  <main class="list">
    {#if entries.length === 0}
      <div class="empty">
        <p>No notes yet.</p>
      </div>
    {:else}
      {#each entries as entry (entry.id)}
        <button class="note-card" onclick={() => onnote(entry.id)}>
          <span class="note-title">{noteTitle(entry)}</span>
          <span class="note-date">{formatDate(entry.createdAt)}</span>
        </button>
      {/each}
    {/if}
  </main>

  <button class="fab" onclick={onnew}>+ New Note</button>
</div>

{#if showEditor}
  <SchemaEditor
    collection={collection}
    onsave={handleSchemaSave}
    oncancel={() => { showEditor = false; }}
  />
{/if}

<style>
  .screen {
    display: flex;
    flex-direction: column;
    flex: 1;
    position: relative;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  .page-title {
    font-size: 1rem;
    font-weight: 600;
    margin: 0;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text);
  }

  .topbar-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
  }

  .btn-back {
    background: none;
    border: none;
    color: var(--accent);
    font-size: 0.9rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    white-space: nowrap;
  }

  .btn-back:hover {
    background: var(--bg-hover);
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 1rem 1.25rem 5rem;
    flex: 1;
  }

  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--text-muted);
    padding: 3rem 1rem;
    font-style: italic;
  }

  .note-card {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    padding: 0.875rem 1rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 0.625rem;
    cursor: pointer;
    text-align: left;
    width: 100%;
    gap: 1rem;
    transition: border-color 0.15s;
  }

  .note-card:hover {
    border-color: var(--accent);
  }

  .note-title {
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .note-date {
    font-size: 0.78rem;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .fab {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 2rem;
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    transition: opacity 0.15s;
  }

  .fab:hover {
    opacity: 0.88;
  }

  .export-wrapper {
    position: relative;
  }

  .export-menu {
    position: absolute;
    right: 0;
    top: calc(100% + 0.4rem);
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    z-index: 50;
    min-width: 10rem;
    overflow: hidden;
  }

  .export-menu button {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.625rem 1rem;
    background: none;
    border: none;
    cursor: pointer;
    font-size: 0.9rem;
    color: var(--text);
  }

  .export-menu button:hover {
    background: var(--bg-hover);
  }
</style>
