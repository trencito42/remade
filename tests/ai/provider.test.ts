import { describe, expect, it } from "vitest";
import { extractJsonFromText } from "@/lib/ai/provider";

describe("AI Provider JSON Extraction", () => {
  it("extracts direct JSON strings", () => {
    const json = extractJsonFromText('{"status": "ok", "count": 42}');
    expect(json).toEqual({ status: "ok", count: 42 });
  });

  it("extracts JSON wrapped in markdown code blocks", () => {
    const raw = `Here is the response:
\`\`\`json
{
  "title": "New Announcement",
  "confirmed": true
}
\`\`\`
Hope this helps!`;

    const json = extractJsonFromText(raw);
    expect(json).toEqual({ title: "New Announcement", confirmed: true });
  });

  it("extracts JSON with surrounding conversational commentary", () => {
    const raw = `Sure thing! {"decision": "attach", "confidence": 0.88} is the answer.`;
    const json = extractJsonFromText(raw);
    expect(json).toEqual({ decision: "attach", confidence: 0.88 });
  });

  it("throws clear error on malformed non-JSON responses", () => {
    expect(() => extractJsonFromText("I cannot answer this query.")).toThrow(
      "Failed to extract valid JSON",
    );
  });
});
