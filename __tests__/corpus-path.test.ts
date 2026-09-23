import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertUnderCorpusRoot,
  clearCorpusCache,
  embeddingsPath,
  loadCorpus,
  parseEmbeddingsFile,
  setCorpusForTests,
} from "@/lib/corpus/load";
import { EMBED_ALGORITHM, EMBEDDING_DIM } from "@/lib/corpus/embed";
import { join, resolve } from "node:path";

afterEach(() => {
  clearCorpusCache();
  vi.unstubAllEnvs();
});

describe("embeddingsPath containment", () => {
  it("defaults under data/corpus", () => {
    const path = embeddingsPath();
    expect(path).toContain(join("data", "corpus"));
    expect(path.endsWith("embeddings.json")).toBe(true);
  });

  it("allows relative override inside data/corpus", () => {
    vi.stubEnv("CLARITY_EMBEDDINGS_PATH", "embeddings.json");
    const path = embeddingsPath();
    expect(path).toBe(
      resolve(process.cwd(), "data", "corpus", "embeddings.json"),
    );
  });

  it("rejects path escape via ..", () => {
    expect(() => assertUnderCorpusRoot("../package.json")).toThrow(
      /data\/corpus/,
    );
  });

  it("allows absolute path inside data/corpus", () => {
    const inside = resolve(process.cwd(), "data", "corpus", "embeddings.json");
    expect(assertUnderCorpusRoot(inside)).toBe(inside);
  });

  it("rejects absolute path outside corpus", () => {
    expect(() => assertUnderCorpusRoot("/etc/passwd")).toThrow(/data\/corpus/);
  });

  it("rejects env override that escapes corpus", () => {
    vi.stubEnv("CLARITY_EMBEDDINGS_PATH", "../../package.json");
    expect(() => embeddingsPath()).toThrow(/data\/corpus/);
  });
});

describe("parseEmbeddingsFile", () => {
  const validChunk = {
    id: "c1",
    embedding: Array.from({ length: EMBEDDING_DIM }, () => 0.1),
    citationLabel: "x",
    sourceUrl: "https://www.indiacode.nic.in/x",
    instrument: "Act",
    section: "1",
    state: "MH",
    themes: ["deposit"],
    text: "body",
  };

  it("rejects invalid shapes", () => {
    expect(() => parseEmbeddingsFile(null)).toThrow(/Invalid/);
    expect(() =>
      parseEmbeddingsFile({
        version: 2,
        algorithm: EMBED_ALGORITHM,
        dim: EMBEDDING_DIM,
        chunks: [validChunk],
      }),
    ).toThrow(/version/);
    expect(() =>
      parseEmbeddingsFile({
        version: 1,
        algorithm: "other",
        dim: EMBEDDING_DIM,
        chunks: [validChunk],
      }),
    ).toThrow(/algorithm/);
    expect(() =>
      parseEmbeddingsFile({
        version: 1,
        algorithm: EMBED_ALGORITHM,
        dim: 3,
        chunks: [validChunk],
      }),
    ).toThrow(/dim/);
    expect(() =>
      parseEmbeddingsFile({
        version: 1,
        algorithm: EMBED_ALGORITHM,
        dim: EMBEDDING_DIM,
        chunks: [],
      }),
    ).toThrow(/no chunks/);
    expect(() =>
      parseEmbeddingsFile({
        version: 1,
        algorithm: EMBED_ALGORITHM,
        dim: EMBEDDING_DIM,
        chunks: [{ ...validChunk, id: "" }],
      }),
    ).toThrow(/Malformed/);
    expect(() =>
      parseEmbeddingsFile({
        version: 1,
        algorithm: EMBED_ALGORITHM,
        dim: EMBEDDING_DIM,
        chunks: [{ ...validChunk, embedding: [1, 2, 3] }],
      }),
    ).toThrow(/wrong embedding length/);
  });
});

describe("loadCorpus cache", () => {
  it("returns injected corpus and caches", () => {
    const chunks = [
      {
        id: "t1",
        embedding: Array.from({ length: EMBEDDING_DIM }, () => 0),
        citationLabel: "t",
        sourceUrl: "https://www.indiacode.nic.in/t",
        instrument: "Act",
        section: "1",
        state: "MH" as const,
        themes: ["deposit"],
        text: "x",
      },
    ];
    setCorpusForTests(chunks);
    expect(loadCorpus()).toBe(chunks);
    expect(loadCorpus()).toBe(chunks);
  });
});
