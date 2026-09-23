import { describe, expect, it } from "vitest";
import { jsonError } from "@/lib/api/errors";

describe("jsonError", () => {
  it("returns JSON body with code and message only", async () => {
    const res = jsonError(400, "INVALID_TOKEN", "Invalid session token.");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      error: { code: "INVALID_TOKEN", message: "Invalid session token." },
    });
    expect(JSON.stringify(body)).not.toMatch(/stack|GROQ_API_KEY/i);
  });
});
