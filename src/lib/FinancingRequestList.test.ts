import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FinancingRequestList from "./FinancingRequestList.svelte";
import type { FinancingRequestSummaryDto } from "./types";

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

const rows: FinancingRequestSummaryDto[] = [
  { id: "req-2", kind: "request", status: "Submitted", amount: 1266250, currency: "EUR", gaps: [], resolutionSource: null, createdOn: "2026-06-27T10:00:00Z", modifiedOn: "2026-06-27T10:00:00Z" },
  { id: "req-1", kind: "request", status: "Approved", amount: 500, currency: "EUR", gaps: [], resolutionSource: null, createdOn: "2026-06-27T09:00:00Z", modifiedOn: "2026-06-27T09:00:00Z" },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("FinancingRequestList", () => {
  it("renders a row per request from the list endpoint", async () => {
    mockFetch(200, rows);

    render(FinancingRequestList);

    expect(await screen.findByText("Submitted")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(fetch).toHaveBeenCalledWith("/api/scrooge-corp/financing-requests");
  });

  it("dispatches a 'select' event with the id when a row is clicked", async () => {
    mockFetch(200, rows);

    const { component } = render(FinancingRequestList);
    const selected: string[] = [];
    component.$on("select", (e) => selected.push(e.detail));

    const firstRow = await screen.findByText("Submitted");
    await fireEvent.click(firstRow);

    expect(selected).toEqual(["req-2"]);
  });

  it("shows an empty-state message when there are no requests", async () => {
    mockFetch(200, []);

    render(FinancingRequestList);

    expect(await screen.findByText(/no financing requests yet/i)).toBeInTheDocument();
  });
});
