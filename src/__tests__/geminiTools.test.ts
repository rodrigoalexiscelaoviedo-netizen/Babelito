import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));
vi.mock("../lib/claude", () => ({ RetryableError: class extends Error {} }));

import { bytesToBase64, normalizePhoto, normalizeVoiceFeedback } from "../lib/geminiTools";
import { neuralVoiceFor } from "../lib/naturalVoice";

describe("normalizeVoiceFeedback", () => {
  it("keeps well-formed feedback and caps tips at 3", () => {
    const r = normalizeVoiceFeedback({
      transcript: "I would like a coffee",
      summary: "Great job!",
      tips: [
        { word: "coffee", problem: "La o suena como en español", fix: "Abre más la boca" },
        { word: "would", problem: "La l no se pronuncia", fix: "Di 'wud'" },
        { word: "like", problem: "p3", fix: "f3" },
        { word: "extra", problem: "p4", fix: "f4" },
      ],
    });
    expect(r?.tips).toHaveLength(3);
    expect(r?.transcript).toBe("I would like a coffee");
  });

  it("drops tips without a word or without any advice, and tolerates garbage", () => {
    const r = normalizeVoiceFeedback({ transcript: "hi", tips: [{ word: "", problem: "x" }, { word: "hi" }, 5, null] });
    expect(r).toEqual({ transcript: "hi", summary: "", tips: [] });
    expect(normalizeVoiceFeedback(null)).toBeNull();
    expect(normalizeVoiceFeedback({})).toBeNull();
    expect(normalizeVoiceFeedback("text")).toBeNull();
  });
});

describe("normalizePhoto", () => {
  it("maps the snake_case summary and limits list sizes", () => {
    const vocab = Array.from({ length: 12 }, (_, i) => ({ en: `w${i}`, es: `p${i}` }));
    const r = normalizePhoto({ kind: "Menu", summary: "A menu.", summary_es: "Una carta.", vocabulary: vocab, phrases: vocab });
    expect(r?.summaryEs).toBe("Una carta.");
    expect(r?.vocabulary).toHaveLength(8);
    expect(r?.phrases).toHaveLength(3);
  });

  it("skips incomplete items and returns null when there is nothing useful", () => {
    const r = normalizePhoto({ summary: "ok", vocabulary: [{ en: "a" }, { es: "b" }, { en: "x", es: "y" }] });
    expect(r?.vocabulary).toEqual([{ en: "x", es: "y" }]);
    expect(normalizePhoto({ vocabulary: [] })).toBeNull();
    expect(normalizePhoto(undefined)).toBeNull();
  });
});

describe("bytesToBase64", () => {
  it("round-trips and handles big buffers", () => {
    const big = new Uint8Array(100_000).map((_, i) => i % 251);
    const back = Uint8Array.from(atob(bytesToBase64(big)), (c) => c.charCodeAt(0));
    expect(back).toEqual(big);
  });
});

describe("neuralVoiceFor", () => {
  it("returns a male alternative for the second speaker of a dialogue", () => {
    expect(neuralVoiceFor("en-GB")).toBe("en-GB-SoniaNeural");
    expect(neuralVoiceFor("en-GB", true)).toBe("en-GB-RyanNeural");
    expect(neuralVoiceFor("en-US", true)).toBe("en-US-GuyNeural");
    expect(neuralVoiceFor("ca-ES", true)).toBeNull();
  });
});
