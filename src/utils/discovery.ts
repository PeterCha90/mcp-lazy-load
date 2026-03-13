import type { ServerConfig } from "./config.js";
import type { ToolEntry } from "../proxy/registry.js";
import { connectToServer, listServerTools, disconnectServer } from "./mcp-client.js";
import { extractKeywords } from "../proxy/registry.js";

export interface ServerResult {
  serverName: string;
  status: "fulfilled" | "rejected" | "skipped";
  toolCount: number;
  error?: string;
  elapsedMs: number;
}

export interface DiscoveryResult {
  tools: ToolEntry[];
  results: ServerResult[];
  totalElapsedMs: number;
}

export async function discoverTools(
  servers: Record<string, ServerConfig>,
  options?: {
    onServerStart?: (serverName: string) => void;
    onServerDone?: (serverName: string, toolCount: number, elapsedMs: number) => void;
    onServerFailed?: (serverName: string, error: string, elapsedMs: number) => void;
  }
): Promise<DiscoveryResult> {
  const serverNames = Object.keys(servers);
  const allTools: ToolEntry[] = [];
  const results: ServerResult[] = [];
  const startMs = Date.now();

  const settled = await Promise.allSettled(
    serverNames.map(async (name): Promise<ToolEntry[]> => {
      const serverConfig = servers[name];
      if (!serverConfig.command) {
        const msg = "no command configured, skipping";
        console.error(`Warning: ${name} has ${msg}`);
        options?.onServerFailed?.(name, msg, 0);
        results.push({
          serverName: name,
          status: "skipped",
          toolCount: 0,
          error: msg,
          elapsedMs: 0,
        });
        return [];
      }

      options?.onServerStart?.(name);
      const serverStart = Date.now();

      try {
        const conn = await connectToServer(serverConfig.command, serverConfig.args, serverConfig.env);
        const tools = await listServerTools(conn.client);
        await disconnectServer(conn);
        const elapsed = Date.now() - serverStart;

        const entries: ToolEntry[] = tools.map((tool) => ({
          name: tool.name,
          description: tool.description ?? "",
          server: name,
          serverDescription: serverConfig.description ?? "",
          inputSchema: tool.inputSchema,
          keywords: extractKeywords(tool.name, tool.description ?? ""),
        }));

        options?.onServerDone?.(name, entries.length, elapsed);
        results.push({
          serverName: name,
          status: "fulfilled",
          toolCount: entries.length,
          elapsedMs: elapsed,
        });
        return entries;
      } catch (error) {
        const elapsed = Date.now() - serverStart;
        const message = error instanceof Error ? error.message : String(error);
        options?.onServerFailed?.(name, message, elapsed);
        results.push({
          serverName: name,
          status: "rejected",
          toolCount: 0,
          error: message,
          elapsedMs: elapsed,
        });
        throw error;
      }
    })
  );

  for (const result of settled) {
    if (result.status === "fulfilled") {
      for (const entry of result.value) {
        allTools.push(entry);
      }
    }
    // Rejected results are already recorded in the results array via the catch block
  }

  return {
    tools: allTools,
    results,
    totalElapsedMs: Date.now() - startMs,
  };
}
