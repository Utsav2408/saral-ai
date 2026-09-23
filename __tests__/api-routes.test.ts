import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { POST as uploadPOST } from "@/app/api/upload/route";
import { GET as sessionGET } from "@/app/api/session/[token]/route";
import { buildSampleLeasePdf } from "@/fixtures/leases/build-sample-pdf";
import { sessionStore } from "@/lib/session/store";

afterEach(() => {
  sessionStore.clear();
});

describe("POST /api/upload", () => {
  it("uploads a text lease and returns a session token", async () => {
    const text = readFileSync(
      join(process.cwd(), "fixtures/leases/sample-lease.txt"),
    );
    const file = new File([text], "sample-lease.txt", { type: "text/plain" });
    const form = new FormData();
    form.append("file", file);

    const res = await uploadPOST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: form,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.token).toMatch(/^[A-Za-z0-9_-]{40,64}$/);
    expect(body.clauseCount).toBeGreaterThanOrEqual(2);
    expect(body.facts.depositAmount).toBe(150000);
  });

  it("uploads a PDF lease", async () => {
    const pdf = await buildSampleLeasePdf();
    const file = new File([Buffer.from(pdf)], "sample-lease.pdf", {
      type: "application/pdf",
    });
    const form = new FormData();
    form.append("file", file);

    const res = await uploadPOST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: form,
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.clauseCount).toBeGreaterThanOrEqual(1);
  });

  it("rejects unsupported types with 415", async () => {
    const file = new File([Buffer.from("x")], "photo.png", {
      type: "image/png",
    });
    const form = new FormData();
    form.append("file", file);
    const res = await uploadPOST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: form,
      }),
    );
    expect(res.status).toBe(415);
    const body = await res.json();
    expect(body.error.code).toBe("UNSUPPORTED_TYPE");
  });

  it("rejects missing file with 400", async () => {
    const form = new FormData();
    const res = await uploadPOST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: form,
      }),
    );
    expect(res.status).toBe(400);
  });
});

describe("GET /api/session/[token]", () => {
  it("returns session for a valid token", async () => {
    const text = readFileSync(
      join(process.cwd(), "fixtures/leases/sample-lease.txt"),
    );
    const file = new File([text], "sample-lease.txt", { type: "text/plain" });
    const form = new FormData();
    form.append("file", file);
    const uploadRes = await uploadPOST(
      new Request("http://localhost/api/upload", {
        method: "POST",
        body: form,
      }),
    );
    const { token } = await uploadRes.json();

    const res = await sessionGET(new Request("http://localhost"), {
      params: Promise.resolve({ token }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.clauses.length).toBeGreaterThan(0);
    expect(body.facts.noticePeriod).toBeTruthy();
  });

  it("returns 400 for invalid token shape", async () => {
    const res = await sessionGET(new Request("http://localhost"), {
      params: Promise.resolve({ token: "bad" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown token", async () => {
    const token = "a".repeat(43);
    const res = await sessionGET(new Request("http://localhost"), {
      params: Promise.resolve({ token }),
    });
    expect(res.status).toBe(404);
  });
});
