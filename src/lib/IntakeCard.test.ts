import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import IntakeCard from "./IntakeCard.svelte";
import type { FinancingRequestSummaryDto } from "./types";

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok, status, json: async () => body }));
}

// A smudged-currency intake: amount read, currency is the gap.
const row: FinancingRequestSummaryDto = {
  id: "intake-1",
  kind: "intake",
  status: "NeedsReview",
  amount: 1266250,
  currency: null,
  gaps: ["Currency"],
  resolutionSource: null,
  createdOn: "2026-07-01T10:00:00Z",
  modifiedOn: "2026-07-01T10:00:00Z",
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("IntakeCard", () => {
  it("renders the missing field and the Ask Aperio button", () => {
    render(IntakeCard, { props: { row } });

    expect(screen.getByText("Needs review")).toBeInTheDocument();
    expect(screen.getByText("Missing fields")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("Currency"); // the one gap
    expect(screen.getByRole("button", { name: /ask aperio to fill the gaps/i })).toBeInTheDocument();
  });

  it("dispatches 'promoted' with the new request id when Aperio fills the gap", async () => {
    mockFetch({ intakeId: "intake-1", promoted: true, financingRequestId: "fr-9", remainingGaps: [], sources: "letter-of-credit.txt" });

    const { component } = render(IntakeCard, { props: { row } });
    const promoted: string[] = [];
    component.$on("promoted", (e) => promoted.push(e.detail));

    await fireEvent.click(screen.getByRole("button", { name: /ask aperio/i }));

    await waitFor(() => expect(promoted).toEqual(["fr-9"]));
    expect(fetch).toHaveBeenCalledWith(
      "/api/scrooge-corp/intake-documents/intake-1/resolve",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the honest-limit message when a gap can't be recovered", async () => {
    mockFetch({ intakeId: "intake-1", promoted: false, financingRequestId: null, remainingGaps: ["BeneficiaryIban"], sources: "missing-iban.txt" });

    render(IntakeCard, { props: { row } });
    await fireEvent.click(screen.getByRole("button", { name: /ask aperio/i }));

    expect(await screen.findByText(/couldn't fill/i)).toHaveTextContent(/Beneficiary IBAN/i);
  });
});
