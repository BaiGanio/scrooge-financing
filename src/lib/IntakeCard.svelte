<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import type { FinancingRequestSummaryDto } from "./types";
  import { loadRequests, money, resolveIntake } from "./api";

  /** The parked (NeedsReview) intake row to render. */
  export let row: FinancingRequestSummaryDto;

  const dispatch = createEventDispatcher<{ promoted: string }>();

  const LABELS: Record<string, string> = {
    Amount: "Invoice amount",
    Currency: "Currency",
    BeneficiaryIban: "Beneficiary IBAN",
  };

  let acting = false;
  let error: string | null = null;
  // Set after an attempt that couldn't close every gap — the honest-limit case.
  let unresolved: { gaps: string[]; sources: string | null } | null = null;

  async function askAperio(): Promise<void> {
    acting = true;
    error = null;
    unresolved = null;
    try {
      const result = await resolveIntake(row.id);
      await loadRequests(); // refresh the shared list + dashboard
      if (result.promoted && result.financingRequestId) {
        dispatch("promoted", result.financingRequestId); // parent selects the new request
      } else {
        unresolved = { gaps: result.remainingGaps, sources: result.sources };
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Resolve failed";
    } finally {
      acting = false;
    }
  }
</script>

<article class="card" data-testid="intake-card">
  <header>
    <h2>Trade document — needs review</h2>
    <p class="slogan">A field or two couldn't be read. Ask the duck's ledger to fill them in. 🦆🔍</p>
  </header>

  <dl>
    <dt>Status</dt>
    <dd><span class="status status--needsreview">Needs review</span></dd>

    <dt>Invoice amount</dt>
    <dd>
      {#if row.amount != null}{money(row.amount, row.currency, 2)}{:else}<span class="gap">to confirm</span>{/if}
    </dd>

    <dt>Currency</dt>
    <dd>
      {#if row.currency}{row.currency}{:else}<span class="gap">to confirm</span>{/if}
    </dd>
  </dl>

  <div class="gaps" role="note">
    <span class="gaps-label">Missing fields</span>
    <ul>
      {#each row.gaps as gap (gap)}
        <li>{LABELS[gap] ?? gap}</li>
      {/each}
    </ul>
  </div>

  <button class="ask" on:click={askAperio} disabled={acting}>
    {acting ? "Asking Aperio…" : "Ask Aperio to fill the gaps"}
  </button>

  {#if unresolved}
    <p class="unresolved" role="status">
      Aperio couldn't fill {unresolved.gaps.map((g) => LABELS[g] ?? g).join(", ")} from the corpus —
      key it in by hand.
      {#if unresolved.sources}<br /><span class="src">Checked: {unresolved.sources}</span>{/if}
    </p>
  {:else if row.resolutionSource}
    <p class="src" role="note">Previously checked: {row.resolutionSource}</p>
  {/if}

  {#if error}
    <p class="bad" role="alert">{error}</p>
  {/if}
</article>

<style>
  .card {
    max-width: 30rem;
    border: 1px solid var(--line);
    border-top: 3px dashed var(--gold);
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
  }
  .status--needsreview {
    background: var(--warn-bg);
    color: var(--warn);
  }
  .gap {
    color: var(--warn);
    font-style: italic;
  }
  .gaps {
    margin-top: 1.1rem;
    padding: 0.7rem 0.9rem;
    background: var(--warn-bg);
    border-left: 3px solid var(--warn);
  }
  .gaps-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--warn);
  }
  .gaps ul {
    margin: 0.3rem 0 0;
    padding-left: 1.1rem;
  }
  .ask {
    margin-top: 1.2rem;
    border: none;
    padding: 0.55rem 1.1rem;
    font-weight: 600;
    cursor: pointer;
    background: var(--gold-deep);
    color: #fff;
  }
  .ask:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  .unresolved {
    margin: 0.9rem 0 0;
    color: var(--ink);
  }
  .src {
    color: var(--muted);
    font-size: 0.85rem;
  }
  .bad {
    color: var(--bad);
    margin: 0.9rem 0 0;
  }
</style>
