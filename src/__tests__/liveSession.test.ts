import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/geminiTools", () => ({ getLiveToken: vi.fn() }));

import {
  base64ToPcm,
  buildSetupMessage,
  downsample,
  floatToPcm16,
  liveSystemPrompt,
  parseServerMessage,
  pcm16ToFloat,
  pcmToBase64,
} from "../lib/liveSession";

describe("audio conversion", () => {
  it("float ↔ PCM16 round-trips within quantisation error and clamps", () => {
    const input = new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2]);
    const pcm = floatToPcm16(input);
    expect(pcm[3]).toBe(32767);
    expect(pcm[4]).toBe(-32768);
    expect(pcm[5]).toBe(32767); // 2 se recorta
    const back = pcm16ToFloat(pcm);
    expect(back[1]).toBeCloseTo(0.5, 3);
    expect(back[2]).toBeCloseTo(-0.5, 3);
  });

  it("base64 ↔ PCM keeps every sample, including big chunks", () => {
    const pcm = new Int16Array(50_000).map((_, i) => (i * 7) % 30000 - 15000);
    expect(base64ToPcm(pcmToBase64(pcm))).toEqual(pcm);
  });

  it("downsamples 48 kHz → 16 kHz to one third of the length by averaging", () => {
    const input = new Float32Array(480).fill(0.3);
    const out = downsample(input, 48000, 16000);
    expect(out.length).toBe(160);
    expect(out[10]).toBeCloseTo(0.3, 5);
    expect(downsample(input, 16000, 16000)).toBe(input);
  });
});

describe("messages", () => {
  it("builds a setup with audio output, transcription and the model prefix", () => {
    const m = buildSetupMessage("gemini-2.5-flash-native-audio-preview-09-2025", "Be kind.", "Aoede");
    expect(m.setup.model).toBe("models/gemini-2.5-flash-native-audio-preview-09-2025");
    expect(m.setup.generationConfig.responseModalities).toEqual(["AUDIO"]);
    expect(m.setup.systemInstruction.parts[0].text).toBe("Be kind.");
    expect(m.setup.inputAudioTranscription).toEqual({});
    expect(buildSetupMessage("models/x", "p").setup.model).toBe("models/x");
  });

  it("parses setup, audio, transcripts, interruptions and turn end", () => {
    const pcm = new Int16Array([1, 2, 3]);
    const events = parseServerMessage({
      setupComplete: {},
      serverContent: {
        modelTurn: { parts: [{ inlineData: { mimeType: "audio/pcm;rate=24000", data: pcmToBase64(pcm) } }, { inlineData: { mimeType: "image/png", data: "xx" } }] },
        inputTranscription: { text: "hello" },
        outputTranscription: { text: "hi there" },
        interrupted: true,
        turnComplete: true,
      },
    });
    const types = events.map((e) => e.type);
    expect(types).toEqual(["setup", "audio", "heard", "said", "interrupted", "turnComplete"]);
    const audio = events.find((e) => e.type === "audio");
    expect(audio && audio.type === "audio" && Array.from(audio.pcm)).toEqual([1, 2, 3]);
  });

  it("returns unknown for empty or malformed messages", () => {
    expect(parseServerMessage({})).toEqual([{ type: "unknown" }]);
    expect(parseServerMessage(null)).toEqual([{ type: "unknown" }]);
    expect(parseServerMessage("x")).toEqual([{ type: "unknown" }]);
  });

  it("system prompt carries level, name and topic", () => {
    const p = liveSystemPrompt({ level: "B1", name: "Ana", topic: "Your weekend" });
    expect(p).toContain("B1");
    expect(p).toContain("Ana");
    expect(p).toContain("Your weekend");
    expect(liveSystemPrompt({ level: "A1", name: "", topic: null })).toContain("Choose a friendly everyday topic");
  });
});
