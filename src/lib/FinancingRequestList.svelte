<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";
  import { listState, loadRequests, money } from "./api";

  /** The currently selected request id (highlighted in the list). */
  export let selectedId: string | null = null;

  const dispatch = createEventDispatcher<{ select: string }>();

  // Show the 7 most recent by default; expand to the last 15.
  const COLLAPSED = 7;
  const EXPANDED = 15;
  let expanded = false;

  $: rows = $listState.kind === "loaded" ? $listState.rows : [];
  $: visibleRows = rows.slice(0, expanded ? EXPANDED : COLLAPSED);

  // Render from the shared store; self-load on mount so the component still works standalone.
  onMount(loadRequests);
</script>

<aside class="list">
  <h2>Requests</h2>

  {#if $listState.kind === "loading"}
    <p role="status">Loading…</p>
  {:else if $listState.kind === "error"}
    <p role="alert">Could not load requests: {$listState.message}</p>
  {:else if rows.length === 0}
    <p>No financing requests yet.</p>
  {:else}
    <ul>
      {#each visibleRows as row (row.id)}
        <li>
          <button
            type="button"
            class:selected={row.id === selectedId}
            on:click={() => dispatch("select", row.id)}
          >
            <span class="status status--{row.status.toLowerCase()}">{row.status}</span>
            {#if row.amount != null}
              <span class="amount">{money(row.amount, row.currency)}</span>
            {:else}
              <span class="review">⚠ review</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>

    {#if rows.length > COLLAPSED}
      <button class="more" type="button" on:click={() => (expanded = !expanded)}>
        {expanded ? "Show less" : `Show more (${Math.min(rows.length, EXPANDED) - COLLAPSED})`}
      </button>
    {/if}
  {/if}
</aside>

<style>
  .list {
    min-width: 15rem;
  }
  h2 {
    margin: 0 0 0.75rem;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  button {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--line);
    background: var(--card);
    cursor: pointer;
    text-align: left;
    font: inherit;
  }
  button:hover {
    background: #faf9ff;
  }
  button.selected {
    border-color: var(--accent);
    background: var(--info-bg);
  }
  button.more {
    justify-content: center;
    margin-top: 0.4rem;
    border-color: var(--gold);
    color: var(--gold-deep);
    font-weight: 600;
    background: transparent;
  }
  button.more:hover {
    background: var(--gold-soft);
  }
  .status {
    padding: 0.15rem 0.55rem;
    font-size: 0.72rem;
    font-weight: 600;
    background: #eef0f5;
  }
  .status--submitted {
    background: var(--warn-bg);
    color: var(--warn);
  }
  .status--approved {
    background: var(--ok-bg);
    color: var(--ok);
  }
  .status--rejected {
    background: var(--bad-bg);
    color: var(--bad);
  }
  .status--needsreview {
    background: var(--warn-bg);
    color: var(--warn);
  }
  .review {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--warn);
  }
  .amount {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    color: var(--ink);
  }
</style>
