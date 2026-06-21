<script lang="ts">
  import { onMount } from 'svelte';
  import { getCollection, getEntry, putEntry, deleteEntry } from '../db';
  import type { Collection, Entry } from '../types';
  import FieldInput from './FieldInput.svelte';

  let {
    collectionId,
    entryId,
    onback,
  }: {
    collectionId: string;
    entryId: string | null;
    onback: () => void;
  } = $props();

  let collection = $state<Collection | null>(null);
  let data = $state<Record<string, string | number | null>>({});
  let originalEntryId = $state<string | null>(entryId);
  let isNew = $state(entryId === null);
  let editing = $state(entryId === null);
  let createdAt = $state<string | null>(null);

  onMount(async () => {
    collection = (await getCollection(collectionId)) ?? null;
    if (!collection) return;

    if (entryId !== null) {
      const entry = await getEntry(entryId);
      if (entry) {
        data = { ...entry.data };
        createdAt = entry.createdAt;
      }
    } else {
      const blank: Record<string, null> = {};
      for (const f of collection.fields) blank[f.id] = null;
      data = blank;
    }
  });

  async function save() {
    if (!collection) return;
    const now = new Date().toISOString();
    const entry: Entry = {
      id: originalEntryId ?? crypto.randomUUID(),
      collectionId,
      data: { ...data },
      createdAt: createdAt ?? now,
    };
    await putEntry(entry);
    originalEntryId = entry.id;
    createdAt = entry.createdAt;
    isNew = false;
    editing = false;
  }

  async function handleDelete() {
    if (!originalEntryId) return;
    if (!confirm('Delete this note?')) return;
    await deleteEntry(originalEntryId);
    onback();
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'short', month: 'long', day: 'numeric', year: 'numeric',
    });
  }
</script>

<div class="screen">
  <header class="topbar">
    <button class="btn-back" onclick={onback}>← Back</button>
    <span class="page-title">{collection?.name ?? '…'}</span>
    <div class="topbar-actions">
      {#if !isNew && !editing}
        <button class="btn-icon-label" onclick={() => { editing = true; }}>✎ Edit</button>
        <button class="btn-icon-label btn-danger-label" onclick={handleDelete}>Delete</button>
      {/if}
    </div>
  </header>

  {#if createdAt && !isNew}
    <div class="note-meta">{formatDate(createdAt)}</div>
  {/if}

  <main class="note-body">
    {#if collection}
      {#each collection.fields as field (field.id)}
        <div class="field-block">
          <label class="field-label" for={field.id}>{field.name}</label>
          <FieldInput
            {field}
            bind:value={data[field.id]}
            readonly={!editing}
          />
        </div>
      {/each}

      {#if editing}
        <div class="form-actions">
          {#if !isNew}
            <button class="btn-secondary" onclick={() => { editing = false; }}>Cancel</button>
          {/if}
          <button class="btn-primary" onclick={save}>Save Note</button>
        </div>
      {/if}
    {/if}
  </main>
</div>

<style>
  .screen {
    display: flex;
    flex-direction: column;
    flex: 1;
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

  .note-meta {
    padding: 0.5rem 1.25rem;
    font-size: 0.78rem;
    color: var(--text-muted);
    background: var(--bg-elevated);
    border-bottom: 1px solid var(--border);
  }

  .note-body {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.25rem;
    flex: 1;
    overflow-y: auto;
  }

  .field-block {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .field-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }

  .btn-danger-label {
    color: var(--danger) !important;
  }
</style>
