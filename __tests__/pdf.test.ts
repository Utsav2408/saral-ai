import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("unpdf", () => ({
  extractText: vi.fn(),
}));

import { extractText } from "unpdf";
import { extractPdfText } from "@/lib/parse/pdf";

describe("extractPdfText", () => {
  beforeEach(() => {
    vi.mocked(extractText).mockReset();
  });

  it("joins array text from unpdf", async () => {
    vi.mocked(extractText).mockResolvedValue({
      text: ["Page one", "Page two"],
      totalPages: 2,
    } as never);
    const result = await extractPdfText(Buffer.from("%PDF-1.4"));
    expect(result.text).toContain("Page one");
    expect(result.truncated).toBe(false);
  });

  it("maps password errors", async () => {
    vi.mocked(extractText).mockRejectedValue(new Error("Password required"));
    await expect(extractPdfText(Buffer.from("%PDF-1.4"))).rejects.toThrow(
      "PASSWORD_PROTECTED",
    );
  });

  it("maps generic parse errors", async () => {
    vi.mocked(extractText).mockRejectedValue(new Error("corrupt"));
    await expect(extractPdfText(Buffer.from("%PDF-1.4"))).rejects.toThrow(
      "PDF_UNREADABLE",
    );
  });
});
