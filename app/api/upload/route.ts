import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/errors";
import { safeLog } from "@/lib/logging/safe-log";
import { processDocument } from "@/lib/parse/process";
import { sessionStore } from "@/lib/session/store";
import {
  titleFromFilename,
  validateUpload,
} from "@/lib/upload/validate";
import type { UploadResponse } from "@/types/session";

export const runtime = "nodejs";

/**
 * POST /api/upload — accept PDF or plain text, parse, create in-memory session.
 * Does not write the uploaded file to disk.
 */
export async function POST(
  request: Request,
): Promise<NextResponse<UploadResponse | { error: { code: string; message: string } }>> {
  const started = Date.now();
  let bytes = 0;
  let mime: string | undefined;
  let ext: string | undefined;

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      safeLog({
        activity: "upload",
        ok: false,
        code: "MISSING_FILE",
        latencyMs: Date.now() - started,
      });
      return jsonError(
        400,
        "MISSING_FILE",
        "No file was uploaded. Choose a PDF or plain text file.",
      );
    }

    bytes = file.size;
    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = validateUpload(file, buffer);

    if (!validation.ok) {
      safeLog({
        activity: "upload",
        ok: false,
        code: validation.code,
        bytes,
        latencyMs: Date.now() - started,
        ext: validation.code === "UNSUPPORTED_TYPE" ? undefined : undefined,
      });
      return jsonError(validation.status, validation.code, validation.message);
    }

    mime = validation.mime;
    ext = validation.ext;

    let processed;
    try {
      processed = await processDocument(buffer, validation.mime);
    } catch (err) {
      const code = err instanceof Error ? err.message : "PROCESS_FAILED";
      if (code === "PASSWORD_PROTECTED") {
        safeLog({
          activity: "upload",
          ok: false,
          code,
          bytes,
          mime,
          ext,
          latencyMs: Date.now() - started,
        });
        return jsonError(
          422,
          "PASSWORD_PROTECTED",
          "This PDF is password-protected and cannot be read.",
        );
      }
      if (code === "NO_TEXT" || code === "PDF_UNREADABLE" || code === "BINARY_TEXT") {
        safeLog({
          activity: "upload",
          ok: false,
          code,
          bytes,
          mime,
          ext,
          latencyMs: Date.now() - started,
        });
        return jsonError(
          422,
          code,
          "We could not extract readable text from that file.",
        );
      }
      throw err;
    }

    const session = sessionStore.create({
      title: titleFromFilename(validation.filename),
      sourceFilename: validation.filename,
      mimeType: validation.mime,
      rawTextLength: processed.text.length,
      clauses: processed.clauses,
      facts: processed.facts,
    });

    safeLog({
      activity: "upload",
      ok: true,
      bytes,
      mime,
      ext,
      clauseCount: session.clauses.length,
      latencyMs: Date.now() - started,
    });

    const body: UploadResponse = {
      token: session.token,
      title: session.title,
      facts: session.facts,
      clauseCount: session.clauses.length,
    };
    return NextResponse.json(body, { status: 201 });
  } catch {
    safeLog({
      activity: "upload",
      ok: false,
      code: "INTERNAL",
      bytes,
      mime,
      ext,
      latencyMs: Date.now() - started,
    });
    return jsonError(
      500,
      "INTERNAL",
      "Something went wrong while processing your document.",
    );
  }
}
