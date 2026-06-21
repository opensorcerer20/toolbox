<script lang="ts">
  import type { Collection, Field, FieldType } from '../types';

  let {
    collection = null,
    onsave,
    oncancel,
  }: {
    collection: Collection | null;
    onsave: (c: Collection) => void;
    oncancel: () => void;
  } = $props();

  let name = $state<string>(collection?.name ?? '');
  let fields = $state<Field[]>(
    collection ? structuredClone($state.snapshot(collection.fields) as Field[]) : []
  );

  const FIELD_TYPES: FieldType[] = ['text', 'textarea', 'number', 'date', 'select'];

  function addField() {
    fields.push({
      id: crypto.randomUUID(),
      name: '',
      type: 'text',
    });
  }

  function removeField(index: number) {
    fields.splice(index, 1);
  }

  function moveUp(index: number) {
    if (index === 0) return;
    [fields[index - 1], fields[index]] = [fields[index], fields[index - 1]];
  }

  function moveDown(index: number) {
    if (index === fields.length - 1) return;
    [fields[index], fields[index + 1]] = [fields[index + 1], fields[index]];
  }

  function addOption(field: Field) {
    if (!field.options) field.options = [];
    field.options.push('');
  }

  function removeOption(field: Field, i: number) {
    field.options?.splice(i, 1);
  }

  function save() {
    const trimmed = name.trim();
    if (!trimmed) return alert('Give this notebook a name.');
    if (fields.length === 0) return alert('Add at least one field.');
    for (const f of fields) {
      if (!f.name.trim()) return alert('All fields need a name.');
    }
    // $state.snapshot strips Svelte 5 Proxy wrappers so IndexedDB can clone the data.
    const plainFields = $state.snapshot(fields) as Field[];
    const saved: Collection = {
      id: collection?.id ?? crypto.randomUUID(),
      name: trimmed,
      fields: plainFields.map(f => ({ ...f, name: f.name.trim() })),
      createdAt: collection?.createdAt ?? new Date().toISOString(),
    };
    onsave(saved);
  }
</script>

<div class="overlay" role="dialog" aria-modal="true">
  <div class="modal" data-testid="schema-modal">
    <header class="modal-header">
      <h2>{collection ? 'Edit Notebook' : 'New Notebook'}</h2>
      <button class="btn-icon" onclick={oncancel}>✕</button>
    </header>

    <div class="modal-body">
      <label class="field-label">
        Notebook name
        <input
          class="input"
          type="text"
          placeholder="e.g. Books I've Read"
          bind:value={name}
        />
      </label>

      <div class="fields-section">
        <div class="fields-header">
          <span class="section-title">Fields</span>
          <button class="btn-secondary btn-sm" onclick={addField}>+ Add Field</button>
        </div>

        {#if fields.length === 0}
          <p class="empty-hint">No fields yet — add one above.</p>
        {/if}

        {#each fields as field, i (field.id)}
          <div class="field-row">
            <div class="field-row-controls">
              <div class="field-row-order">
                <button class="btn-icon-sm" onclick={() => moveUp(i)} disabled={i === 0} title="Move up">↑</button>
                <button class="btn-icon-sm" onclick={() => moveDown(i)} disabled={i === fields.length - 1} title="Move down">↓</button>
              </div>
              <input
                class="input field-name-input"
                type="text"
                placeholder="Field name"
                bind:value={field.name}
              />
              <select class="input select-type" bind:value={field.type}>
                {#each FIELD_TYPES as t}
                  <option value={t}>{t}</option>
                {/each}
              </select>
              <button class="btn-icon btn-danger" onclick={() => removeField(i)} title="Remove field">✕</button>
            </div>

            {#if field.type === 'select'}
              <div class="options-editor">
                <span class="options-label">Options</span>
                {#each field.options ?? [] as _, oi}
                  <div class="option-row">
                    <input
                      class="input"
                      type="text"
                      placeholder="Option value"
                      bind:value={(field.options as string[])[oi]}
                    />
                    <button class="btn-icon btn-danger btn-sm" onclick={() => removeOption(field, oi)}>✕</button>
                  </div>
                {/each}
                <button class="btn-secondary btn-sm" onclick={() => addOption(field)}>+ Add Option</button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <footer class="modal-footer">
      <button class="btn-secondary" onclick={oncancel}>Cancel</button>
      <button class="btn-primary" onclick={save}>Save</button>
    </footer>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 100;
    padding: 0;
  }

  @media (min-width: 640px) {
    .overlay {
      align-items: center;
      padding: 1rem;
    }
  }

  .modal {
    background: var(--bg-elevated);
    border-radius: 1rem 1rem 0 0;
    width: 100%;
    max-width: 600px;
    max-height: 90dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  @media (min-width: 640px) {
    .modal {
      border-radius: 1rem;
    }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .modal-header h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    color: var(--text);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-top: 1px solid var(--border);
    flex-shrink: 0;
  }

  .field-label {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .section-title {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .fields-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .fields-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .empty-hint {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-style: italic;
    margin: 0;
  }

  .field-row {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 0.5rem;
    padding: 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .field-row-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .field-row-order {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  .field-name-input {
    flex: 1;
  }

  .select-type {
    width: 8rem;
    flex-shrink: 0;
  }

  .options-editor {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }

  .options-label {
    font-size: 0.78rem;
    font-weight: 500;
    color: var(--text-muted);
  }

  .option-row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
  }

  .option-row .input {
    flex: 1;
  }
</style>
