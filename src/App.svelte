<script lang="ts">
  import Hero from "./lib/Hero.svelte";
  import StatsBar from "./lib/StatsBar.svelte";
  import FinancingRequestList from "./lib/FinancingRequestList.svelte";
  import FinancingRequestCard from "./lib/FinancingRequestCard.svelte";
  import IntakeCard from "./lib/IntakeCard.svelte";
  import UploadPanel from "./lib/UploadPanel.svelte";
  import { listState } from "./lib/api";

  // Optional deep-link: ?id=<guid> pre-selects a request; otherwise pick from the list.
  let selectedId: string | null =
    new URLSearchParams(window.location.search).get("id");

  function onSelect(e: CustomEvent<string>): void {
    selectedId = e.detail;
  }

  // Feed the dashboard cards from the shared list store.
  $: rows = $listState.kind === "loaded" ? $listState.rows : [];

  // On first load (no deep-link), open the most recently updated request in the detail pane.
  // The list itself stays newest-created-first; this only drives the initial selection.
  $: if (selectedId === null && rows.length > 0) {
    selectedId = [...rows].sort((a, b) => b.modifiedOn.localeCompare(a.modifiedOn))[0].id;
  }

  // A freshly uploaded request (or parked intake) becomes the selected one.
  function onCreated(e: CustomEvent<string>): void {
    selectedId = e.detail;
  }

  // Once an intake is resolved+promoted, jump the detail pane to the new request.
  function onPromoted(e: CustomEvent<string>): void {
    selectedId = e.detail;
  }

  // The selected list row (if any) — tells us whether to show the request or the intake card.
  $: selectedRow = rows.find((r) => r.id === selectedId) ?? null;
</script>

<Hero />
<StatsBar {rows} />

<main>
  <FinancingRequestList {selectedId} on:select={onSelect} />

  <section class="detail">
    <div class="request">
      {#if selectedRow?.kind === "intake"}
        {#key selectedId}
          <IntakeCard row={selectedRow} on:promoted={onPromoted} />
        {/key}
      {:else if selectedId}
        {#key selectedId}
          <FinancingRequestCard id={selectedId} />
        {/key}
      {:else}
        <p class="hint">Select a request to see its details, or upload a document alongside.</p>
      {/if}
    </div>

    <div class="upload-col">
      <UploadPanel on:created={onCreated} />
    </div>
  </section>
</main>

<footer class="footer">
  Developed by <strong>Scrooge McDuck Global Corp.</strong> 🎩 💰
</footer>

<style>
  main {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
    padding: 0 1.5rem 2.5rem;
  }
  .detail {
    flex: 1;
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 1.5rem;
  }
  .request,
  .upload-col {
    flex: 1 1 24rem;
    min-width: 0;
    max-width: 30rem;
  }
  .hint {
    color: var(--muted);
  }
  .footer {
    background: var(--hat-black);
    color: var(--gold);
    text-align: center;
    padding: 0.9rem 1rem;
    font-size: 0.9rem;
    letter-spacing: 0.03em;
    border-top: 3px solid var(--gold);
  }
  .footer strong {
    color: #fff;
  }
</style>
