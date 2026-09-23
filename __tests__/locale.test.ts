import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  localeFromBody,
  nextLocale,
  parseLocale,
} from "@/lib/i18n/locale";
import { greetingKey, translate } from "@/lib/i18n/messages";
import {
  HINDI_OUTPUT_RULES,
  simplifyLocaleInstruction,
  withLocaleSystemPrompt,
} from "@/lib/i18n/ai-locale";

describe("parseLocale", () => {
  it("accepts en and hi", () => {
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("hi")).toBe("hi");
  });

  it("falls back to English", () => {
    expect(parseLocale("fr")).toBe(DEFAULT_LOCALE);
    expect(parseLocale(null)).toBe("en");
  });
});

describe("nextLocale / localeFromBody", () => {
  it("toggles en ↔ hi", () => {
    expect(nextLocale("en")).toBe("hi");
    expect(nextLocale("hi")).toBe("en");
  });

  it("reads locale from JSON body", () => {
    expect(localeFromBody({ locale: "hi", message: "x" })).toBe("hi");
    expect(localeFromBody({})).toBe("en");
    expect(localeFromBody(null)).toBe("en");
  });
});

describe("translate", () => {
  it("returns English and Hindi strings", () => {
    expect(translate("en", "home.title")).toContain("lease");
    expect(translate("hi", "home.title")).toContain("किरायानामा");
  });

  it("interpolates vars", () => {
    expect(translate("en", "overview.clauses", { count: 3 })).toBe(
      "Clauses (3)",
    );
    expect(translate("hi", "simplify.clause", { index: 2 })).toContain("2");
  });

  it("greetingKey maps hour bands", () => {
    expect(greetingKey(8)).toBe("home.greeting.morning");
    expect(greetingKey(14)).toBe("home.greeting.afternoon");
    expect(greetingKey(20)).toBe("home.greeting.evening");
  });
});

describe("ai-locale", () => {
  it("adds Hindi rules only for hi", () => {
    expect(withLocaleSystemPrompt("BASE", "en")).toBe("BASE");
    expect(withLocaleSystemPrompt("BASE", "hi")).toContain(HINDI_OUTPUT_RULES.trim());
    expect(simplifyLocaleInstruction("hi")).toMatch(/Hindi/);
    expect(simplifyLocaleInstruction("en")).toBe("");
  });
});
