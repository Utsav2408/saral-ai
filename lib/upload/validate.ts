import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants";

type UploadValidationOk = {
  ok: true;
  mime: string;
  ext: string;
  filename: string;
};

type UploadValidationErr = {
  ok: false;
  code: string;
  message: string;
  status: number;
};

export type UploadValidationResult = UploadValidationOk | UploadValidationErr;

/**
 * Validate an uploaded file against allowlist, size, and magic bytes.
 * Complexity: O(1) for magic-byte checks (fixed prefix).
 */
export function validateUpload(
  file: File | null | undefined,
  buffer: Buffer | null,
): UploadValidationResult {
  if (!file) {
    return {
      ok: false,
      code: "MISSING_FILE",
      message: "No file was uploaded. Choose a PDF or plain text file.",
      status: 400,
    };
  }

  const filename = sanitizeFilename(file.name);
  const ext = getExtension(filename);

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message:
        "Only PDF and plain text (.txt) files are supported in this version.",
      status: 415,
    };
  }

  const declaredMime = (file.type || "").toLowerCase() || mimeFromExt(ext);
  if (
    declaredMime &&
    !ALLOWED_MIME_TYPES.has(declaredMime) &&
    declaredMime !== "application/octet-stream"
  ) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message:
        "Only PDF and plain text (.txt) files are supported in this version.",
      status: 415,
    };
  }

  if (file.size <= 0 || (buffer && buffer.length === 0)) {
    return {
      ok: false,
      code: "EMPTY_FILE",
      message: "The uploaded file is empty.",
      status: 400,
    };
  }

  if (file.size > MAX_UPLOAD_BYTES || (buffer && buffer.length > MAX_UPLOAD_BYTES)) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "File must be 5 MB or smaller.",
      status: 413,
    };
  }

  if (buffer) {
    const magic = sniffMagic(buffer, ext);
    if (!magic.ok) {
      return magic;
    }
  }

  const mime =
    declaredMime && ALLOWED_MIME_TYPES.has(declaredMime)
      ? declaredMime
      : mimeFromExt(ext);

  return { ok: true, mime, ext, filename };
}

type MagicResult = { ok: true } | UploadValidationErr;

/**
 * Strip path components from a client-provided filename.
 */
export function sanitizeFilename(name: string): string {
  const base = name.replace(/\\/g, "/").split("/").pop() ?? "document";
  return base.slice(0, 200) || "document";
}

function getExtension(filename: string): string {
  const idx = filename.lastIndexOf(".");
  if (idx < 0) {
    return "";
  }
  return filename.slice(idx).toLowerCase();
}

function mimeFromExt(ext: string): string {
  if (ext === ".pdf") {
    return "application/pdf";
  }
  return "text/plain";
}

function sniffMagic(buffer: Buffer, ext: string): MagicResult {
  if (ext === ".pdf") {
    const head = buffer.subarray(0, 5).toString("latin1");
    if (!head.startsWith("%PDF-")) {
      return {
        ok: false,
        code: "INVALID_PDF",
        message: "File does not look like a valid PDF.",
        status: 415,
      };
    }
  }
  // Plain text: defer binary check to extractPlainText
  return { ok: true };
}

/**
 * Build a human title from filename (without extension).
 */
export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  return base || "Uploaded lease";
}
