import type { TaskId } from "./tasks";
import type { JsonValue, ToolCall } from "./types";
import { uid } from "./ids";

export type PolicyStep = {
  name: ToolCall["name"];
  arguments: { [key: string]: JsonValue };
};

/**
 * Deterministic teacher policies. They solve each world without an LLM so
 * traces, transcripts, and markdown exports work even when no model is wired.
 */
export const REFERENCE_POLICIES: Record<TaskId, PolicyStep[]> = {
  "civic-library": [
    { name: "snapshot", arguments: {} },
    {
      name: "run",
      arguments: {
        actions: [{ op: "fill", id: "SEARCH", value: "Silent Spring" }],
      },
    },
    {
      name: "run",
      arguments: {
        actions: [{ op: "click", id: "SEARCH_BTN" }],
      },
    },
    { name: "snapshot", arguments: {} },
    {
      name: "run",
      arguments: { actions: [{ op: "click", id: "RECORD" }] },
    },
    { name: "extract", arguments: { instruction: "call number", schemaHint: "callNumber" } },
    {
      name: "done",
      arguments: { answer: "QH545.P4 C38", rationale: "From the Silent Spring catalog record." },
    },
  ],
  "climate-observatory": [
    { name: "snapshot", arguments: {} },
    {
      name: "run",
      arguments: { actions: [{ op: "select", id: "DECADE", value: "2020s" }] },
    },
    { name: "extract", arguments: { instruction: "warmest year in the anomaly table", schemaHint: "warmestYear" } },
    {
      name: "done",
      arguments: { answer: "2024", rationale: "Highest anomaly in the 2020s observatory table." },
    },
  ],
  "citation-desk": [
    { name: "snapshot", arguments: {} },
    { name: "run", arguments: { actions: [{ op: "click", id: "REVEAL" }] } },
    { name: "extract", arguments: { instruction: "MLA works cited fields", schemaHint: "author title journal year pages" } },
    {
      name: "done",
      arguments: {
        answer:
          'Okonkwo, Ada. "Community Seed Libraries and Food Sovereignty." Journal of Open Agriculture, vol. 12, no. 3, 2021, pp. 44-61.',
      },
    },
  ],
  "recipe-archive": [
    { name: "snapshot", arguments: {} },
    {
      name: "run",
      arguments: { actions: [{ op: "click", id: "RECIPE" }] },
    },
    { name: "extract", arguments: { instruction: "ingredient names only", schemaHint: "ingredients" } },
    {
      name: "done",
      arguments: { answer: "flour, water, salt, yeast, honey, oil" },
    },
  ],
  "literacy-tutor": [
    { name: "snapshot", arguments: {} },
    {
      name: "run",
      arguments: { actions: [{ op: "click", id: "Q2B" }] },
    },
    {
      name: "run",
      arguments: { actions: [{ op: "click", id: "GRADE" }] },
    },
    { name: "snapshot", arguments: {} },
    {
      name: "done",
      arguments: { answer: "B, 1/1", rationale: "Thoreau went to the woods to live deliberately." },
    },
  ],
  "permit-desk": [
    { name: "snapshot", arguments: {} },
    { name: "run", arguments: { actions: [{ op: "click", id: "TYPE_GARDEN" }] } },
    { name: "snapshot", arguments: {} },
    { name: "run", arguments: { actions: [{ op: "click", id: "ELIG_RESIDENT" }] } },
    { name: "run", arguments: { actions: [{ op: "click", id: "ELIG_NONCOM" }] } },
    { name: "run", arguments: { actions: [{ op: "click", id: "ELIG_SHARE" }] } },
    { name: "snapshot", arguments: {} },
    { name: "run", arguments: { actions: [{ op: "click", id: "CONTINUE" }] } },
    { name: "snapshot", arguments: {} },
    {
      name: "run",
      arguments: { actions: [{ op: "fill", id: "NAME", value: "Ada Okonkwo" }] },
    },
    {
      name: "run",
      arguments: { actions: [{ op: "fill", id: "INTENT", value: "shared greens" }] },
    },
    {
      name: "run",
      arguments: { actions: [{ op: "select", id: "SEASON", value: "Spring 2026" }] },
    },
    { name: "run", arguments: { actions: [{ op: "click", id: "SUBMIT" }] } },
    { name: "extract", arguments: { instruction: "issued permit id", schemaHint: "permitId" } },
    {
      name: "done",
      arguments: { answer: "PRM-GARDEN-2026-441", rationale: "Issued on the confirmation page." },
    },
  ],
  "county-archive": [
    { name: "snapshot", arguments: {} },
    {
      name: "run",
      arguments: { actions: [{ op: "fill", id: "SEARCH", value: "thoreau" }] },
    },
    { name: "run", arguments: { actions: [{ op: "click", id: "SEARCH_BTN" }] } },
    {
      name: "run",
      arguments: { actions: [{ op: "select", id: "YEAR", value: "1847" }] },
    },
    { name: "snapshot", arguments: {} },
    { name: "run", arguments: { actions: [{ op: "click", id: "LETTER" }] } },
    { name: "run", arguments: { actions: [{ op: "click", id: "TAB_CATALOG" }] } },
    { name: "extract", arguments: { instruction: "accession number", schemaHint: "accession" } },
    {
      name: "done",
      arguments: { answer: "MSS.WAL.1847.03", rationale: "From the Cataloging tab." },
    },
  ],
  "reading-room": [
    { name: "snapshot", arguments: {} },
    { name: "act", arguments: { action: "open the first document on the desk" } },
    { name: "extract", arguments: { instruction: "key fact from the open document", schemaHint: "summary" } },
    {
      name: "done",
      arguments: { answer: "Extracted from the ingested reading room document.", rationale: "User corpus." },
    },
  ],
};

export function materializePolicy(
  steps: PolicyStep[],
  resolveId: (token: string) => string | undefined,
): ToolCall[] {
  return steps.map((step) => {
    const args = structuredClone(step.arguments);
    if (Array.isArray(args.actions)) {
      for (const action of args.actions as Array<Record<string, string>>) {
        if (action.id && !/^\d+-\d+$/.test(action.id)) {
          const resolved = resolveId(action.id);
          if (resolved) action.id = resolved;
        }
      }
    }
    return { id: uid("call"), name: step.name, arguments: args };
  });
}

export function resolvePolicyToken(tree: string, token: string): string | undefined {
  const lines = tree.split("\n");
  const pick = (pred: (line: string) => boolean) =>
    lines.find(pred)?.match(/\[(\d+-\d+)\]/)?.[1];

  switch (token) {
    case "SEARCH":
      return pick((l) => /searchbox|textbox/.test(l));
    case "SEARCH_BTN":
      return pick((l) => /button/.test(l) && /search/i.test(l));
    case "RECORD":
      return pick((l) => /silent spring/i.test(l) && /button|link/.test(l));
    case "RECIPE":
      return pick((l) => /farm loaf/i.test(l) && /link|button/.test(l));
    case "Q2B":
      return pick((l) => /live deliberately/i.test(l));
    case "GRADE":
      return pick((l) => /grade quiz|submit/i.test(l) && /button/.test(l));
    case "DECADE":
      return pick((l) => /combobox/.test(l) && /decade/i.test(l));
    case "REVEAL":
      return pick((l) => /button/.test(l) && /show paper card|reveal/i.test(l));
    case "TYPE_GARDEN":
      return pick((l) => /community garden/i.test(l) && /button|link/.test(l));
    case "ELIG_RESIDENT":
      return pick((l) => /button/.test(l) && /yes/i.test(l) && /resident of the county/i.test(l));
    case "ELIG_NONCOM":
      return pick((l) => /button/.test(l) && /yes/i.test(l) && /non-commercial/i.test(l));
    case "ELIG_SHARE":
      return pick((l) => /button/.test(l) && /yes/i.test(l) && /community kitchen/i.test(l));
    case "CONTINUE":
      return pick((l) => /button/.test(l) && /continue/i.test(l));
    case "NAME":
      return pick((l) => /textbox/.test(l) && /full name|applicant/i.test(l));
    case "INTENT":
      return pick((l) => /textbox/.test(l) && /intent|purpose/i.test(l));
    case "SEASON":
      return pick((l) => /combobox/.test(l) && /season/i.test(l));
    case "SUBMIT":
      return pick((l) => /button/.test(l) && /submit application|submit/i.test(l));
    case "YEAR":
      return pick((l) => /combobox/.test(l) && /year/i.test(l));
    case "LETTER":
      return pick((l) => /emerson/i.test(l) && /1847/.test(l) && /button|link/.test(l));
    case "TAB_CATALOG":
      return pick((l) => /cataloging/i.test(l) && /tab|button|link/.test(l));
    case "OPEN_DOC":
      return pick((l) => /button/.test(l) && /open|document/i.test(l));
    default:
      return pick((l) => l.toLowerCase().includes(token.toLowerCase()));
  }
}
