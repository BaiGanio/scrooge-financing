import { writable } from "svelte/store";
import type {
  FinancingRequestDto,
  FinancingRequestSummaryDto,
  ResolveIntakeResult,
} from "./types";

const BASE = "/api/scrooge-corp/financing-requests";

export type ListState =
  | { kind: "loading" }
  | { kind: "loaded"; rows: FinancingRequestSummaryDto[] }
  | { kind: "error"; message: string };

// Single source of truth for the request list — List renders it, App feeds it to
// StatsBar, and every mutation (upload / approve / reject) calls loadRequests() to refresh.
export const listState = writable<ListState>({ kind: "loading" });

export async function loadRequests(): Promise<void> {
  listState.set({ kind: "loading" });
  try {
    const res = await fetch(BASE);
    if (!res.ok) {
      listState.set({ kind: "error", message: `Request failed (${res.status})` });
      return;
    }
    listState.set({ kind: "loaded", rows: (await res.json()) as FinancingRequestSummaryDto[] });
  } catch (e) {
    listState.set({ kind: "error", message: e instanceof Error ? e.message : "Network error" });
  }
}

export async function getRequest(id: string): Promise<FinancingRequestDto | null> {
  const res = await fetch(`${BASE}/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as FinancingRequestDto;
}

export async function approve(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}/approve`, { method: "POST" });
  if (!res.ok) throw new Error(await errorText(res));
}

export async function reject(id: string, reason: string): Promise<void> {
  const res = await fetch(`${BASE}/${id}/reject`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error(await errorText(res));
}

export async function upload(
  file: File,
  creditLimit: number,
  creditLimitCurrency: string,
): Promise<{ id: string; needsReview: boolean }> {
  const form = new FormData();
  form.append("file", file);
  form.append("creditLimit", String(creditLimit));
  form.append("creditLimitCurrency", creditLimitCurrency);

  const res = await fetch(`${BASE}/intake/upload`, { method: "POST", body: form });
  if (!res.ok) throw new Error(await errorText(res));
  const body = (await res.json()) as { id: string; needsReview?: boolean };
  return { id: body.id, needsReview: body.needsReview ?? false };
}

// "Ask Aperio to fill the gaps" on a parked (NeedsReview) intake.
export async function resolveIntake(id: string): Promise<ResolveIntakeResult> {
  const res = await fetch(`/api/scrooge-corp/intake-documents/${id}/resolve`, { method: "POST" });
  if (!res.ok) throw new Error(await errorText(res));
  return (await res.json()) as ResolveIntakeResult;
}

async function errorText(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error ?? body?.title ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export function money(amount: number | null, currency: string | null, maxFraction = 0): string {
  if (amount == null || !currency) return "—";
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: maxFraction,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}
