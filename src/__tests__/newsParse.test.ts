import { describe, expect, it } from "vitest";
import { parseAtom, summarize } from "../../supabase/functions/news-feed/parse";

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Claude Code</title>
  <entry>
    <id>tag:github.com,2008:Repository/1/v2.0.0</id>
    <title>v2.0.0</title>
    <link rel="alternate" type="text/html" href="https://github.com/anthropics/claude-code/releases/tag/v2.0.0"/>
    <updated>2026-11-01T10:00:00Z</updated>
    <content type="html">&lt;p&gt;New &lt;b&gt;faster&lt;/b&gt; &amp; safer tools.&lt;/p&gt;</content>
  </entry>
  <entry>
    <title>sin enlace seguro</title>
    <link href="http://insecure.example/x"/>
    <updated>2026-10-01T10:00:00Z</updated>
    <content type="html">x</content>
  </entry>
</feed>`;

describe("parseAtom", () => {
  it("extrae título, enlace, fecha, fuente y resumen en texto plano", () => {
    const [item] = parseAtom(FEED, "fallback");
    expect(item.title).toBe("v2.0.0");
    expect(item.link).toBe("https://github.com/anthropics/claude-code/releases/tag/v2.0.0");
    expect(item.published).toBe("2026-11-01T10:00:00Z");
    expect(item.source).toBe("Claude Code");
    expect(item.summary).toBe("New faster & safer tools.");
  });
  it("descarta entradas sin enlace https", () => {
    expect(parseAtom(FEED, "x")).toHaveLength(1);
  });
});

describe("summarize", () => {
  it("corta en una palabra y agrega …", () => {
    const long = "word ".repeat(100);
    const s = summarize(long, 40);
    expect(s.endsWith("…")).toBe(true);
    expect(s.length).toBeLessThanOrEqual(41);
  });
});
