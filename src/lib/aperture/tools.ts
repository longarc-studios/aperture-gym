import type { ToolName } from "./types";

export type ToolSchema = {
  name: ToolName;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
};

/**
 * Stagehand v4 integration contract, reverse-engineered from
 * https://docs.stagehand.dev/v4/integrations/overview
 *
 * Every integration (Claude Code, Codex, Eve, Deep Agents, CrewAI, Mastra,
 * fx, Pi, Vercel AI SDK) exposes one persistent browser and three tools:
 * run, snapshot, screenshot. We keep that surface, then add the v4
 * primitives (act / extract / observe) and a Gym `done` action so any
 * model can close an episode with a graded answer.
 */
export const TOOLS: ToolSchema[] = [
  {
    name: "snapshot",
    description:
      "Read a compact accessibility tree for the active page. Pass the bracketed IDs on interactive elements to `run` actions. IDs are valid only for the latest snapshot of the active page. Take another snapshot after navigation or when an ID becomes stale. When vision is on, the tool result also includes a schematic image of the page.",
    parameters: {
      type: "object",
      properties: {
        includeIframes: {
          type: "boolean",
          description: "Whether to include iframe content in the tree.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "run",
    description:
      "Execute a batch of snapshot actions that reference IDs from the latest snapshot, or a small Playwright-shaped code snippet against `page`. Accepts exactly one of `code` or `actions`. Snapshot actions support click, hover, fill, type, press, select, scroll, and goto. Example actions: [{ \"op\": \"click\", \"id\": \"1-42\" }]. Example code: await page.goto('/worlds/civic-library'); return await page.title();",
    parameters: {
      type: "object",
      properties: {
        actions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              op: {
                type: "string",
                enum: ["click", "hover", "fill", "type", "press", "select", "scroll", "goto"],
              },
              id: { type: "string", description: "Snapshot ID, e.g. 1-12" },
              value: { type: "string" },
              url: { type: "string" },
              key: { type: "string", description: "Key name for press, e.g. Enter" },
            },
            required: ["op"],
          },
        },
        code: {
          type: "string",
          description:
            "Whitelisted Playwright-shaped JavaScript. Only page.goto, page.title, page.url, page.locator(...).(click|fill|type|hover), and page.keyboard.press are accepted. Not eval.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "screenshot",
    description:
      "Capture the active page as a schematic JPEG. Multimodal models receive the image as a tool result; text-only models get a caption. Prefer snapshot for IDs, screenshot when layout matters.",
    parameters: {
      type: "object",
      properties: {
        fullPage: { type: "boolean" },
        type: { type: "string", enum: ["png", "jpeg"] },
      },
      additionalProperties: false,
    },
  },
  {
    name: "observe",
    description:
      "Rank candidate actions on the current page without clicking. Returns selector IDs scored against your instruction, plus a short plan (Stagehand observe()).",
    parameters: {
      type: "object",
      properties: {
        instruction: {
          type: "string",
          description: "What you are trying to do, e.g. 'find the search box'.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "act",
    description:
      "Perform a single natural-language action by matching it against the latest snapshot (Stagehand act()). Resolves fill/click/select/press from the ranked tree. Prefer snapshot IDs via `run` when you already know the target.",
    parameters: {
      type: "object",
      properties: {
        action: {
          type: "string",
          description: "Natural language action, e.g. 'click the Search button' or 'fill the search box with Silent Spring'.",
        },
      },
      required: ["action"],
      additionalProperties: false,
    },
  },
  {
    name: "extract",
    description:
      "Extract structured fields from the current page (Stagehand extract()). Returns labeled pairs, tables, lists, pattern matches (call numbers, accession, permit IDs), and instruction-focused snippets — not a raw text dump.",
    parameters: {
      type: "object",
      properties: {
        instruction: { type: "string" },
        schemaHint: {
          type: "string",
          description: "Short description of the fields you want back, e.g. callNumber or warmestYear.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "done",
    description:
      "Submit the episode answer and stop. Use this when you have the information the task asked for. The environment grades the answer and records process flags.",
    parameters: {
      type: "object",
      properties: {
        answer: { type: "string", description: "Final answer for the task." },
        rationale: { type: "string" },
      },
      required: ["answer"],
      additionalProperties: false,
    },
  },
];

export const TOOL_NAMES = TOOLS.map((t) => t.name);

export function toolsForOpenAI() {
  return TOOLS.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

export const SYSTEM_PROMPT = `You are an agent in Aperture, a model-agnostic RL environment reverse-engineered from Stagehand v4.

You have one persistent browser. Page state, authentication, and navigation survive across tool calls. There is no separate navigate tool — use \`run\`.

Tool contract:
- snapshot: read the accessibility tree (and a schematic image when vision is on). Bracketed IDs such as [1-12] are the only legal targets for click/fill/type/select. IDs go stale after navigation; snapshot again.
- run: pass either { "actions": [...] } or { "code": "await page.goto('...'); return await page.title();" }. Actions: click, hover, fill, type, press, select, scroll, goto.
- screenshot: visual inspection. The image is returned to you as a multimodal tool result.
- observe: ranked candidate IDs for an instruction. Use it when you are lost.
- act: one natural-language action, resolved against the tree (fill/click/select/press).
- extract: structured fields, tables, and patterned IDs — not a raw dump. Prefer this for call numbers, accession numbers, permit IDs, citations, tables.
- done: submit the final answer. Always call done to finish.

Rules:
1. Snapshot before you click.
2. Do not invent IDs.
3. Stay on hosted world pages (paths under /worlds/). Do not attempt external sites.
4. Be concise. One or two tools per turn.
5. When you know the answer, call done.
6. After a click that changes the page, snapshot again — IDs are stale.
7. If your runtime cannot emit native tool calls, reply with a single JSON object and nothing else: {"tool":"snapshot","arguments":{}} or {"tool":"done","arguments":{"answer":"..."}}.
8. Good-hearted use only: research, accessibility, tutoring, open knowledge. No harm, no scraping of private data.`;
