import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Server-only call to the Lovable AI Gateway (OpenAI-compatible /chat/completions).
 * Reads LOVABLE_API_KEY from the server runtime; never exposed to the client.
 *
 * This is the SINGLE entry point for the semantic reasoning layer. All
 * grounding (chapter, rubric, formulas, weakness, memory, OCR) is composed
 * client-side via `buildGroundingPrompt` and passed in as `grounding`.
 */

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

const MessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(20000),
});

const InputSchema = z.object({
  model: z.string().min(1).max(128).optional(),
  systemPrompt: z.string().min(1).max(8000),
  grounding: z.string().max(20000).optional(),
  messages: z.array(MessageSchema).min(1).max(40),
  responseFormat: z.enum(["text", "json_object"]).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type SemanticReasoningResult = {
  ok: true;
  model: string;
  content: string;
} | {
  ok: false;
  status: number;
  error: string;
};

export const runSemanticReasoning = createServerFn({ method: "POST" })
  .inputValidator((input) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<SemanticReasoningResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false, status: 500, error: "LOVABLE_API_KEY not configured" };
    }

    const model = data.model ?? DEFAULT_MODEL;
    const messages = [
      { role: "system" as const, content: data.systemPrompt },
      ...(data.grounding
        ? [{ role: "system" as const, content: `Grounding context:\n${data.grounding}` }]
        : []),
      ...data.messages,
    ];

    let res: Response;
    try {
      res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: data.temperature ?? 0.4,
          ...(data.responseFormat === "json_object"
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, status: 502, error: `Gateway fetch failed: ${message}` };
    }

    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) {
        return {
          ok: false,
          status: 429,
          error: "Rate limit exceeded. Please try again in a moment.",
        };
      }
      if (res.status === 402) {
        return {
          ok: false,
          status: 402,
          error:
            "AI credits exhausted. Add credits in Settings → Workspace → Usage.",
        };
      }
      return {
        ok: false,
        status: res.status,
        error: `Gateway error ${res.status}: ${body.slice(0, 500)}`,
      };
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    return { ok: true, model, content };
  });