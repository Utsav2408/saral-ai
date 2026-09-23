/**
 * Generate a minimal PDF buffer containing the sample lease text (for tests).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";

export async function buildSampleLeasePdf(): Promise<Uint8Array> {
  const textPath = join(process.cwd(), "fixtures/leases/sample-lease.txt");
  // Standard PDF fonts are WinAnsi — replace unsupported glyphs.
  const text = readFileSync(textPath, "utf8").replace(/₹/g, "Rs. ");
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const lines = text.split("\n");
  let y = 750;
  for (const line of lines) {
    if (y < 40) {
      break;
    }
    const safe = line.replace(/[^\x20-\x7E]/g, " ").slice(0, 90);
    page.drawText(safe, {
      x: 50,
      y,
      size: 10,
      font,
    });
    y -= 14;
  }
  return doc.save();
}
