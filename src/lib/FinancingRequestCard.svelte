<script lang="ts">
  import { onMount } from "svelte";
  import type { FinancingRequestDto } from "./types";
  import { approve, getRequest, loadRequests, money, reject } from "./api";

  /** The FinancingRequest id to fetch (CustomId / GUID string). */
  export let id: string;

  type State =
    | { kind: "loading" }
    | { kind: "loaded"; data: FinancingRequestDto }
    | { kind: "notfound" }
    | { kind: "error"; message: string };

  let state: State = { kind: "loading" };
  let acting = false;
  let actionError: string | null = null;

  async function load(): Promise<void> {
    state = { kind: "loading" };
    try {
      const data = await getRequest(id);
      state = data ? { kind: "loaded", data } : { kind: "notfound" };
    } catch (e) {
      state = { kind: "error", message: e instanceof Error ? e.message : "Network error" };
    }
  }

  async function onApprove(): Promise<void> {
    await runAction(() => approve(id));
  }

  async function onReject(): Promise<void> {
    const reason = window.prompt("Reason for rejection?");
    if (!reason) return;
    await runAction(() => reject(id, reason));
  }

  async function runAction(action: () => Promise<void>): Promise<void> {
    acting = true;
    actionError = null;
    try {
      await action();
      await load(); // refresh this card
      await loadRequests(); // refresh the shared list + dashboard
    } catch (e) {
      actionError = e instanceof Error ? e.message : "Action failed";
    } finally {
      acting = false;
    }
  }

  onMount(load);
</script>

<article class="card" data-testid="financing-card">
  <header>
    <h2>Financing Request</h2>
    <p class="slogan">Scrooge McDuck's money bin is officially open for business. 🦆💰</p>
  </header>

  {#if state.kind === "loading"}
    <p role="status">Loading…</p>
  {:else if state.kind === "notfound"}
    <p role="alert">No financing request found for <code>{id}</code>.</p>
  {:else if state.kind === "error"}
    <p role="alert">Something went wrong: {state.message}</p>
  {:else}
    <dl>
      <dt>Status</dt>
      <dd><span class="status status--{state.data.status.toLowerCase()}">{state.data.status}</span></dd>

      <dt>Seller</dt>
      <dd>
        {#if state.data.seller}
          {state.data.seller}
        {:else}
          <span class="gap">to confirm</span>
        {/if}
      </dd>

      <dt>Invoice amount</dt>
      <dd>{money(state.data.amount, state.data.currency, 2)}</dd>

      {#if state.data.creditLimitAmount}
        <dt>Credit limit</dt>
        <dd>{money(state.data.creditLimitAmount, state.data.creditLimitCurrency, 2)}</dd>

        <dt>Available headroom</dt>
        <dd class={state.data.creditLimitAmount - state.data.amount < 0 ? "headroom-neg" : "headroom-pos"}>
          {money(state.data.creditLimitAmount - state.data.amount, state.data.currency, 2)}
        </dd>
      {/if}

      <dt>Beneficiary IBAN</dt>
      <dd>
        {#if state.data.debtorIban}
          <code>{state.data.debtorIban}</code>
        {:else}
          <span class="gap">to confirm</span>
        {/if}
      </dd>

      <dt>Source document</dt>
      <dd>
        {#if state.data.docId}
          <code>{state.data.docId}</code>
        {:else}
          <span class="gap">to confirm</span>
        {/if}
      </dd>
    </dl>

    {#if state.data.status === "Rejected"}
      <div class="rejection" role="note">
        <span class="rejection-label">Rejection reason</span>
        <span class="rejection-reason">{state.data.rejectionReason ?? "—"}</span>
      </div>
    {/if}

    {#if state.data.status === "Submitted"}
      <div class="actions">
        <button class="approve" on:click={onApprove} disabled={acting}>Approve</button>
        <button class="reject" on:click={onReject} disabled={acting}>Reject</button>
      </div>
    {/if}

    {#if actionError}
      <p class="bad" role="alert">{actionError}</p>
    {/if}
  {/if}
</article>

<style>
  .card {
    max-width: 30rem;
    border: 1px solid var(--line);
    border-top: 3px solid var(--gold);
    padding: 1.25rem 1.5rem;
    background: var(--card);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }
  h2 {
    margin: 0;
  }
  .slogan {
    margin: 0.25rem 0 1rem;
    color: var(--muted);
    font-size: 0.9rem;
  }
  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.55rem 1rem;
    margin: 0;
  }
  dt {
    font-weight: 600;
    color: #444;
  }
  dd {
    margin: 0;
  }
  .status {
    padding: 0.15rem 0.55rem;
    font-size: 0.8rem;
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
  .gap {
    color: var(--warn);
    font-style: italic;
  }
  .actions {
    display: flex;
    gap: 0.6rem;
    margin-top: 1.2rem;
  }
  .actions button {
    border: none;
    padding: 0.55rem 1.1rem;
    font-weight: 600;
    cursor: pointer;
  }
  .actions button:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  .approve {
    background: var(--ok);
    color: #fff;
  }
  .reject {
    background: var(--bad);
    color: #fff;
  }
  .bad {
    color: var(--bad);
  }
  .rejection {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    margin-top: 1.1rem;
    padding: 0.7rem 0.9rem;
    background: var(--bad-bg);
    border-left: 3px solid var(--bad);
  }
  .rejection-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--bad);
  }
  .rejection-reason {
    color: var(--ink);
  }
  .headroom-pos {
    color: var(--ok);
    font-weight: 600;
  }
  .headroom-neg {
    color: var(--bad);
    font-weight: 600;
  }
</style>
