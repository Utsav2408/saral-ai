import { describe, expect, it } from "vitest";
import { safeCitationHref } from "@/lib/chat/safe-citation-url";

describe("safeCitationHref", () => {
  it("allows https allowlisted hosts", () => {
    expect(
      safeCitationHref("https://www.indiacode.nic.in/handle/123456789/15817"),
    ).toContain("indiacode.nic.in");
  });

  it("rejects http, unknown hosts, and dangerous schemes", () => {
    expect(safeCitationHref("http://www.indiacode.nic.in/x")).toBeNull();
    expect(safeCitationHref("https://evil.example/phish")).toBeNull();
    expect(safeCitationHref("not-a-url")).toBeNull();
    expect(safeCitationHref(undefined)).toBeNull();
    expect(safeCitationHref("javascript:alert(1)")).toBeNull();
    expect(
      safeCitationHref("https://user:pass@www.indiacode.nic.in/x"),
    ).toBeNull();
    expect(
      safeCitationHref("https://www.indiacode.nic.in.evil.example/x"),
    ).toBeNull();
    expect(
      safeCitationHref("https://evil.example/?u=https://www.indiacode.nic.in"),
    ).toBeNull();
  });
});
