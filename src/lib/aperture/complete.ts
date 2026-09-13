import { createServerFn } from "@tanstack/react-start";
import type { ChatMessage, ModelConfig } from "./types";

export const getAiStatus = createServerFn({ method: "POST" }).handler(async () => {
  const { aiStatus } = await import("./complete.server");
  return aiStatus();
});

export const probeRuntime = createServerFn({ method: "POST" })
  .validator((input: { baseUrl: string }) => input)
  .handler(async ({ data }) => {
    const { probeRuntime: probe } = await import("./complete.server");
    return probe(data.baseUrl);
  });

export const completeTurn = createServerFn({ method: "POST", strict: false })
  .validator((input: { config: ModelConfig; messages: ChatMessage[]; vision?: boolean }) => input)
  .handler(async ({ data }) => {
    const { complete } = await import("./complete.server");
    return complete(data);
  });
