import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FinancingRequestCard from "./FinancingRequestCard.svelte";
import type { FinancingRequestDto } from "./types";

function mockFetch(status: number, body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }),
  );
}

const sample: FinancingRequestDto = {
  id: "fr-1",
  status: "Approved",
  amount: 1266250,
  currency: "EUR",
  creditLimitAmount: 2000000,
  creditLimitCurrency: "EUR",
  seller: "Deutsche Edelstahl GmbH",
  debtorIban: "DE89370400440532013000",
  docId: "LC-2026-06-001",
  docHash: "abc123",
  rejectionReason: null,
  createdOn: "2026-06-27T10:00:00Z",
  modifiedOn: "2026-06-27T10:05:00Z",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FinancingRequestCard", () => {
  it("renders the extracted fields on the happy path", async () => {
    mockFetch(200, sample);

    render(FinancingRequestCard, { props: { id: "fr-1" } });

    expect(await screen.findByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("DE89370400440532013000")).toBeInTheDocument();
    expect(screen.getByText("LC-2026-06-001")).toBeInTheDocument();
    // Money is currency-formatted (€ + grouping), not the raw number.
    // Amount and credit limit are both formatted, so there are several.
    expect(screen.getAllByText(/€/).length).toBeGreaterThan(0);
    expect(screen.getByText(/money bin/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/scrooge-corp/financing-requests/fr-1",
    );
  });

  it("shows a 'to confirm' gap when an extracted field is null", async () => {
    mockFetch(200, { ...sample, debtorIban: null });

    render(FinancingRequestCard, { props: { id: "fr-1" } });

    // Wait for load to resolve, then assert the gap is surfaced (not a crash).
    expect(await screen.findByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("to confirm")).toBeInTheDocument();
  });

  it("shows a not-found message on 404", async () => {
    mockFetch(404, null);

    render(FinancingRequestCard, { props: { id: "missing" } });

    expect(await screen.findByRole("alert")).toHaveTextContent(/no financing request found/i);
  });
});
