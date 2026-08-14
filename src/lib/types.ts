// Mirrors BGAPI.ApplicationServices.ScroogeCorp.Queries.FinancingRequestDto
// (the flat Dapper read model). Kept as a hand-written contract on the client
// side — the read DTO is the API's stable surface.
// Mirrors FinancingRequestSummaryDto — the lean read model for the list view. Carries both
// card kinds: a real "request", or a parked "intake" (a broken upload with gaps to fill).
export interface FinancingRequestSummaryDto {
  id: string;
  kind: "request" | "intake";
  status: string;
  amount: number | null;
  currency: string | null;
  gaps: string[];
  resolutionSource: string | null;
  createdOn: string;
  modifiedOn: string;
}

// Mirrors ResolveIntakeDocumentResult — the outcome of "Ask Aperio to fill the gaps".
export interface ResolveIntakeResult {
  intakeId: string;
  promoted: boolean;
  financingRequestId: string | null;
  remainingGaps: string[];
  sources: string | null;
}

export interface FinancingRequestDto {
  id: string;
  status: string;
  amount: number;
  currency: string;
  creditLimitAmount: number;
  creditLimitCurrency: string;
  seller: string | null;
  debtorIban: string | null;
  docId: string | null;
  docHash: string | null;
  rejectionReason: string | null;
  createdOn: string;
  modifiedOn: string;
}
