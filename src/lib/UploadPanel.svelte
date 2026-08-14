<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { upload, loadRequests } from "./api";

  const dispatch = createEventDispatcher<{ created: string }>();

  let files: FileList | null = null;
  let creditLimit = 2_000_000;
  let currency = "EUR";

  type State =
    | { kind: "idle" }
    | { kind: "uploading" }
    | { kind: "done"; id: string; needsReview: boolean }
    | { kind: "error"; message: string };

  let state: State = { kind: "idle" };

  async function submit(): Promise<void> {
    const file = files?.[0];
    if (!file) {
      state = { kind: "error", message: "Choose a file first." };
      return;
    }
    state = { kind: "uploading" };
    try {
      const { id, needsReview } = await upload(file, creditLimit, currency);
      state = { kind: "done", id, needsReview };
      await loadRequests(); // refresh the shared list + dashboard
      dispatch("created", id);
    } catch (e) {
      state = { kind: "error", message: e instanceof Error ? e.message : "Upload failed" };
    }
  }
</script>

<section class="upload">
  <h2>Upload a trade document</h2>
  <p class="hint">Text, PDF, or a scanned image. Scans are read by the local vision model. 🦆</p>

  <form on:submit|preventDefault={submit}>
    <label class="file">
      <span>Document</span>
      <input
        type="file"
        accept=".txt,.md,.pdf,image/*"
        on:change={(e) => (files = e.currentTarget.files)}
      />
    </label>

    <div class="row">
      <label>
        <span>Credit limit</span>
        <input type="number" min="0" step="1000" bind:value={creditLimit} />
      </label>
      <label>
        <span>Currency</span>
        <input type="text" maxlength="3" bind:value={currency} />
      </label>
    </div>

    <button type="submit" disabled={state.kind === "uploading"}>
      {state.kind === "uploading" ? "Uploading…" : "Submit for financing"}
    </button>
  </form>

  {#if state.kind === "done" && state.needsReview}
    <p class="review" role="status">
      Parked for review — a field couldn't be read. Open the card to ask Aperio. ⚠
    </p>
  {:else if state.kind === "done"}
    <p class="ok" role="status">Created request <code>{state.id}</code> ✓</p>
  {:else if state.kind === "error"}
    <p class="bad" role="alert">{state.message}</p>
  {/if}
</section>

<style>
  .upload {
    background: var(--card);
    border: 1px solid var(--line);
    border-top: 3px solid var(--gold);
    padding: 1.25rem 1.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  h2 {
    margin: 0 0 0.25rem;
  }
  .hint {
    margin: 0 0 1rem;
    color: var(--muted);
    font-size: 0.9rem;
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink);
  }
  .row {
    display: flex;
    gap: 1rem;
  }
  .row label {
    flex: 1;
  }
  input {
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--line);
    font: inherit;
  }
  button {
    align-self: flex-start;
    background: var(--accent);
    color: #fff;
    border: none;
    padding: 0.6rem 1.1rem;
    font-weight: 600;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  .ok {
    color: var(--ok);
    margin: 0.9rem 0 0;
  }
  .bad {
    color: var(--bad);
    margin: 0.9rem 0 0;
  }
  .review {
    color: var(--warn);
    margin: 0.9rem 0 0;
  }
</style>
