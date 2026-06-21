<script lang="ts">
  import CollectionList from './components/CollectionList.svelte';
  import NoteList from './components/NoteList.svelte';
  import NoteDetail from './components/NoteDetail.svelte';

  type Screen =
    | { name: 'home' }
    | { name: 'notes'; collectionId: string }
    | { name: 'detail'; collectionId: string; entryId: string | null };

  let screen = $state<Screen>({ name: 'home' });

  function goHome() {
    screen = { name: 'home' };
  }

  function goNotes(collectionId: string) {
    screen = { name: 'notes', collectionId };
  }

  function goDetail(collectionId: string, entryId: string | null) {
    screen = { name: 'detail', collectionId, entryId };
  }
</script>

<div class="app">
  {#if screen.name === 'home'}
    <CollectionList onopen={goNotes} />
  {:else if screen.name === 'notes'}
    <NoteList
      collectionId={screen.collectionId}
      onback={goHome}
      onnote={entryId => goDetail((screen as { name: 'notes'; collectionId: string }).collectionId, entryId)}
      onnew={() => goDetail((screen as { name: 'notes'; collectionId: string }).collectionId, null)}
    />
  {:else if screen.name === 'detail'}
    <NoteDetail
      collectionId={screen.collectionId}
      entryId={screen.entryId}
      onback={() => goNotes((screen as { name: 'detail'; collectionId: string; entryId: string | null }).collectionId)}
    />
  {/if}
</div>

<style>
  .app {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }
</style>
