<script lang="ts">
  import type { Field } from '../types';

  let {
    field,
    value = $bindable(),
    readonly = false,
  }: {
    field: Field;
    value: string | number | null;
    readonly?: boolean;
  } = $props();
</script>

{#if readonly}
  <span class="value-display">{value ?? ''}</span>
{:else if field.type === 'textarea'}
  <textarea
    class="input textarea"
    value={value ?? ''}
    oninput={e => { value = (e.target as HTMLTextAreaElement).value; }}
    rows={4}
  ></textarea>
{:else if field.type === 'select'}
  <select
    class="input"
    value={value ?? ''}
    onchange={e => { value = (e.target as HTMLSelectElement).value; }}
  >
    <option value="">— select —</option>
    {#each field.options ?? [] as opt}
      <option value={opt}>{opt}</option>
    {/each}
  </select>
{:else if field.type === 'number'}
  <input
    class="input"
    type="number"
    value={value ?? ''}
    oninput={e => {
      const v = (e.target as HTMLInputElement).value;
      value = v === '' ? null : Number(v);
    }}
  />
{:else if field.type === 'date'}
  <input
    class="input"
    type="date"
    value={value ?? ''}
    onchange={e => { value = (e.target as HTMLInputElement).value || null; }}
  />
{:else}
  <input
    class="input"
    type="text"
    value={value ?? ''}
    oninput={e => { value = (e.target as HTMLInputElement).value; }}
  />
{/if}

<style>
  .textarea {
    resize: vertical;
    min-height: 6rem;
    font-family: inherit;
  }

  .value-display {
    display: block;
    padding: 0.25rem 0;
    min-height: 1.5em;
    color: var(--text);
    font-size: 0.9rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
</style>
