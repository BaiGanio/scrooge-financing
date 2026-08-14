<script lang="ts">
  import type { FinancingRequestSummaryDto } from "./types";
  import { money } from "./api";

  /** All request rows; the cards are derived from these (client-side aggregation). */
  export let rows: FinancingRequestSummaryDto[] = [];

  // Reactive counts — must reference `rows` directly so Svelte re-renders when the list loads.
  $: submittedCount = rows.filter((r) => r.status === "Submitted").length;
  $: approvedCount = rows.filter((r) => r.status === "Approved").length;
  $: rejectedCount = rows.filter((r) => r.status === "Rejected").length;

  // Total approved exposure — sum the approved amounts (assume a single currency for the demo).
  $: approvedRows = rows.filter((r) => r.status === "Approved");
  $: approvedTotal = approvedRows.reduce((sum, r) => sum + (r.amount ?? 0), 0);
  $: currency = approvedRows[0]?.currency ?? rows[0]?.currency ?? "EUR";
</script>

<section class="stats" aria-label="Financing dashboard">
  <article class="card">
    <h3>Submitted</h3>
    <p class="big" data-testid="stat-submitted">{submittedCount}</p>
    <span class="sub">awaiting decision</span>
  </article>

  <article class="card approved">
    <h3>Approved</h3>
    <p class="big" data-testid="stat-approved">{approvedCount}</p>
    <span class="sub">financed</span>
  </article>

  <article class="card rejected">
    <h3>Rejected</h3>
    <p class="big" data-testid="stat-rejected">{rejectedCount}</p>
    <span class="sub">declined</span>
  </article>

  <article class="card accent">
    <h3>Approved exposure 💰</h3>
    <p class="big" data-testid="stat-exposure">{money(approvedTotal, currency)}</p>
    <span class="sub">total financed</span>
  </article>
</section>

<style>
  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
    gap: 1rem;
    padding: 1.5rem;
  }
  .card {
    background: var(--card);
    border: 1px solid var(--line);
    border-top: 3px solid var(--gold);
    padding: 1rem 1.2rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  h3 {
    margin: 0 0 0.4rem;
    font-size: 0.85rem;
    color: var(--muted);
    font-weight: 600;
  }
  .big {
    margin: 0;
    font-size: 1.9rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .sub {
    font-size: 0.75rem;
    color: var(--muted);
  }
  .card.approved .big {
    color: var(--ok);
  }
  .card.rejected .big {
    color: var(--bad);
  }
  /* the "money bin" tile — solid coin gold */
  .card.accent {
    background: linear-gradient(180deg, var(--gold) 0%, var(--gold-deep) 100%);
    border: 1px solid var(--gold-deep);
    border-top: 3px solid var(--hat-black);
  }
  .card.accent h3,
  .card.accent .sub {
    color: #3d2c00;
  }
  .card.accent .big {
    color: var(--hat-black);
  }
</style>
