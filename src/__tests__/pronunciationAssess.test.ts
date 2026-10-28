import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabaseClient", () => ({ supabase: {} }));

import { encodeWav, parseAzureResult, wordTone } from "../lib/pronunciationAssess";

describe("encodeWav", () => {
  it("writes a valid 16 kHz mono PCM header and clamps samples", () => {
    const wav = encodeWav(new Float32Array([0, 1, -1, 2]), 16000);
    const view = new DataView(wav.buffer);
    const tag = (o: number) => String.fromCharCode(...wav.slice(o, o + 4));
    expect(tag(0)).toBe("RIFF");
    expect(tag(8)).toBe("WAVE");
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(22, true)).toBe(1);
    expect(wav.length).toBe(44 + 4 * 2);
    expect(view.getInt16(46, true)).toBe(32767);
    expect(view.getInt16(48, true)).toBe(-32768);
    expect(view.getInt16(50, true)).toBe(32767);
  });
});

describe("parseAzureResult", () => {
  it("reads flat scores and per-word results", () => {
    const r = parseAzureResult({
      RecognitionStatus: "Success",
      NBest: [
        {
          AccuracyScore: 90.4,
          FluencyScore: 80,
          CompletenessScore: 100,
          PronScore: 85.6,
          Words: [
            { Word: "hello", AccuracyScore: 95, ErrorType: "None" },
            { Word: "world", AccuracyScore: 40, ErrorType: "Mispronunciation" },
          ],
        },
      ],
    });
    expect(r).toMatchObject({ overall: 86, accuracy: 90, fluency: 80, completeness: 100 });
    expect(r?.words).toHaveLength(2);
    expect(r?.words[1]).toEqual({ word: "world", score: 40, errorType: "Mispronunciation" });
  });

  it("reads scores nested under PronunciationAssessment", () => {
    const r = parseAzureResult({
      NBest: [
        {
          PronunciationAssessment: { AccuracyScore: 70, FluencyScore: 60, CompletenessScore: 90, PronScore: 72 },
          Words: [{ Word: "a", PronunciationAssessment: { AccuracyScore: 70, ErrorType: "None" } }],
        },
      ],
    });
    expect(r?.overall).toBe(72);
    expect(r?.words[0].score).toBe(70);
  });

  it("returns null without NBest", () => {
    expect(parseAzureResult({ RecognitionStatus: "NoMatch" })).toBeNull();
    expect(parseAzureResult(null)).toBeNull();
  });
});

describe("wordTone", () => {
  it("classifies by score and error type", () => {
    expect(wordTone({ word: "a", score: 90, errorType: "None" })).toBe("good");
    expect(wordTone({ word: "a", score: 65, errorType: "None" })).toBe("fair");
    expect(wordTone({ word: "a", score: 30, errorType: "None" })).toBe("poor");
    expect(wordTone({ word: "a", score: 10, errorType: "Omission" })).toBe("poor");
  });
});
