<script lang="ts">
  import { onMount } from 'svelte';
  import { getCollections, putCollection, deleteCollection } from '../db';
  import type { Collection } from '../types';
  import SchemaEditor from './SchemaEditor.svelte';

  let { onopen }: { onopen: (id: string) => void } = $props();

  let collections = $state<Collection[]>([]);
  let showEditor = $state(false);
  let editingCollection = $state<Collection | null>(null);

  onMount(async () => {
    collections = await getCollections();
  });

  async function handleSave(collection: Collection) {
    await putCollection(collection);
    collections = await getCollections();
    showEditor = false;
    editingCollection = null;
  }

  function openNew() {
    editingCollection = null;
    showEditor = true;
  }

  function openEdit(e: Event, col: Collection) {
    e.stopPropagation();
    editingCollection = col;
    showEditor = true;
  }

  async function handleDelete(e: Event, col: Collection) {
    e.stopPropagation();
    if (!confirm(`Delete "${col.name}" and all its notes?`)) return;
    await deleteCollection(col.id);
    collections = await getCollections();
  }
</script>

<div class="screen">
  <header class="topbar">
    <h1 class="app-title">Field Notes</h1>
    <button class="btn-primary" onclick={openNew}>+ New Notebook</button>
  </header>

  <main class="list">
    {#if collections.length === 0}
      <div class="empty">
        <p>No notebooks yet.</p>
        <p>Create one to start taking structured notes.</p>
      </div>
    {:else}
      {#each collections as col (col.id)}
        <div
          class="collection-card"
          role="button"
          tabindex="0"
          onclick={() => onopen(col.id)}
          onkeydown={e => { if (e.key === 'Enter' || e.key === ' ') onopen(col.id); }}
        >
          <div class="card-body">
            <span class="card-name">{col.name}</span>
            <span class="card-meta">{col.fields.length} field{col.fields.length !== 1 ? 's' : ''}</span>
          </div>
          <div class="card-actions">
            <button class="btn-icon" title="Edit schema" onclick={e => openEdit(e, col)}>✎</button>
            <button class="btn-icon btn-danger" title="Delete" onclick={e => handleDelete(e, col)}>✕</button>
          </div>
        </div>
      {/each}
    {/if}
  </main>
</div>

{#if showEditor}
  <SchemaEditor
    collection={editingCollection}
    onsave={handleSave}
    oncancel={() => { showEditor = false; editingCollection = null; }}
  />
{/if}

<style>
  .screen {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  .app-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--accent);
    margin: 0;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.25rem;
    flex: 1;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 0.5rem;
    color: var(--text-muted);
    text-align: center;
    padding: 3rem 1rem;
  }

  .collection-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    background: var(--bg-elevated);
    border: 1px solid var(--border);
    border-radius: 0.75rem;
    cursor: pointer;
    text-align: left;
    width: 100%;
    transition: border-color 0.15s;
  }

  .collection-card:hover {
    border-color: var(--accent);
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .card-name {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
  }

  .card-meta {
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .card-actions {
    display: flex;
    gap: 0.5rem;
  }
</style>
