import { cleanup, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import StatsBar from "./StatsBar.svelte";
import type { FinancingRequestSummaryDto } from "./types";

const base = { kind: "request" as const, gaps: [], resolutionSource: null };
const rows: FinancingRequestSummaryDto[] = [
  { ...base, id: "a", status: "Submitted", amount: 1000, currency: "EUR", createdOn: "2026-06-27T10:00:00Z", modifiedOn: "2026-06-27T10:00:00Z" },
  { ...base, id: "b", status: "Approved", amount: 5000, currency: "EUR", createdOn: "2026-06-27T09:00:00Z", modifiedOn: "2026-06-27T09:00:00Z" },
  { ...base, id: "c", status: "Approved", amount: 2500, currency: "EUR", createdOn: "2026-06-27T08:00:00Z", modifiedOn: "2026-06-27T08:00:00Z" },
  { ...base, id: "d", status: "Rejected", amount: 800, currency: "EUR", createdOn: "2026-06-27T07:00:00Z", modifiedOn: "2026-06-27T07:00:00Z" },
];

afterEach(cleanup);

describe("StatsBar", () => {
  it("counts requests by status", () => {
    render(StatsBar, { props: { rows } });

    expect(screen.getByTestId("stat-submitted")).toHaveTextContent("1");
    expect(screen.getByTestId("stat-approved")).toHaveTextContent("2");
    expect(screen.getByTestId("stat-rejected")).toHaveTextContent("1");
  });

  it("sums approved exposure (currency-formatted)", () => {
    render(StatsBar, { props: { rows } });

    // 5000 + 2500 = 7500, formatted with € and grouping.
    expect(screen.getByTestId("stat-exposure")).toHaveTextContent("€7,500");
  });

  it("handles an empty list", () => {
    render(StatsBar, { props: { rows: [] } });

    expect(screen.getByTestId("stat-submitted")).toHaveTextContent("0");
    expect(screen.getByTestId("stat-exposure")).toHaveTextContent("€0");
  });
});
