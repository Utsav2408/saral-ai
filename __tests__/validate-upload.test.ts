import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import {
  sanitizeFilename,
  titleFromFilename,
  validateUpload,
} from "@/lib/upload/validate";

function fakeFile(
  name: string,
  type: string,
  size: number,
): File {
  const blob = new Blob([new Uint8Array(Math.min(size, 16))], { type });
  return new File([blob], name, { type });
}

describe("validateUpload", () => {
  it("accepts a valid txt file", () => {
    const content = Buffer.from("hello lease");
    const file = new File([content], "lease.txt", { type: "text/plain" });
    const result = validateUpload(file, content);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.ext).toBe(".txt");
      expect(result.mime).toBe("text/plain");
    }
  });

  it("accepts a PDF with magic bytes", () => {
    const content = Buffer.from("%PDF-1.4 rest of file");
    const file = new File([content], "lease.pdf", { type: "application/pdf" });
    const result = validateUpload(file, content);
    expect(result.ok).toBe(true);
  });

  it("rejects unsupported extension", () => {
    const content = Buffer.from("MZ");
    const file = fakeFile("virus.exe", "application/octet-stream", 2);
    const result = validateUpload(file, content);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(415);
      expect(result.code).toBe("UNSUPPORTED_TYPE");
    }
  });

  it("rejects empty file", () => {
    const content = Buffer.alloc(0);
    const file = new File([content], "empty.txt", { type: "text/plain" });
    Object.defineProperty(file, "size", { value: 0 });
    const result = validateUpload(file, content);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("EMPTY_FILE");
    }
  });

  it("rejects oversized file", () => {
    const content = Buffer.alloc(10);
    const file = new File([content], "big.txt", { type: "text/plain" });
    Object.defineProperty(file, "size", { value: MAX_UPLOAD_BYTES + 1 });
    const result = validateUpload(file, content);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(413);
    }
  });

  it("rejects PDF without magic header", () => {
    const content = Buffer.from("not a pdf");
    const file = new File([content], "fake.pdf", { type: "application/pdf" });
    const result = validateUpload(file, content);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("INVALID_PDF");
    }
  });

  it("rejects missing file", () => {
    const result = validateUpload(null, null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("MISSING_FILE");
    }
  });

  it("rejects disallowed MIME even with txt extension", () => {
    const content = Buffer.from("hello");
    const file = new File([content], "lease.txt", { type: "image/png" });
    const result = validateUpload(file, content);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UNSUPPORTED_TYPE");
    }
  });

  it("accepts octet-stream when extension is allowed", () => {
    const content = Buffer.from("plain text lease");
    const file = new File([content], "lease.txt", {
      type: "application/octet-stream",
    });
    const result = validateUpload(file, content);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.mime).toBe("text/plain");
    }
  });
});

describe("filename helpers", () => {
  it("sanitizes path traversal in names", () => {
    expect(sanitizeFilename("../../etc/passwd.txt")).toBe("passwd.txt");
  });

  it("builds title from filename", () => {
    expect(titleFromFilename("1BHK_Lease-Andheri.txt")).toBe(
      "1BHK Lease Andheri",
    );
  });

  it("returns empty title fallback", () => {
    expect(titleFromFilename(".txt")).toBe("Uploaded lease");
  });
});
