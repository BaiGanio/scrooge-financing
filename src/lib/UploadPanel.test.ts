import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import UploadPanel from "./UploadPanel.svelte";

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok, status, json: async () => body }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UploadPanel", () => {
  it("POSTs the chosen file to the upload endpoint and shows the new id", async () => {
    mockFetch({ id: "fr-new" });

    const { container } = render(UploadPanel);

    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(["invoice text"], "invoice.txt", { type: "text/plain" });
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    await fireEvent.change(input);

    await fireEvent.click(screen.getByRole("button", { name: /submit for financing/i }));

    expect(await screen.findByText(/fr-new/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      "/api/scrooge-corp/financing-requests/intake/upload",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows an error when no file is chosen", async () => {
    mockFetch({});

    render(UploadPanel);
    await fireEvent.click(screen.getByRole("button", { name: /submit for financing/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/choose a file/i);
  });
});
