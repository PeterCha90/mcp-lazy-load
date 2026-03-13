import {
  loadServersBackup,
  computeServerFingerprint,
  saveToolCache,
} from "../utils/config.js";
import { discoverTools } from "../utils/discovery.js";

const BANNER = `
\x1b[36m\x1b[1m ███╗   ███╗ ██████╗██████╗       ██╗      █████╗ ███████╗██╗   ██╗
 ████╗ ████║██╔════╝██╔══██╗      ██║     ██╔══██╗╚══███╔╝╚██╗ ██╔╝
 ██╔████╔██║██║     ██████╔╝█████╗██║     ███████║  ███╔╝  ╚████╔╝
 ██║╚██╔╝██║██║     ██╔═══╝ ╚════╝██║     ██╔══██║ ███╔╝    ╚██╔╝
 ██║ ╚═╝ ██║╚██████╗██║           ███████╗██║  ██║███████╗   ██║
 ╚═╝     ╚═╝ ╚═════╝╚═╝           ╚══════╝╚═╝  ╚═╝╚══════╝   ╚═╝\x1b[0m
`;

function formatTime(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export async function runInit(): Promise<void> {
  console.log(BANNER);

  const servers = loadServersBackup();
  const serverNames = Object.keys(servers);

  if (serverNames.length === 0) {
    console.log("  No MCP servers registered.");
    console.log("  Run \x1b[36mmcp-lazy add --<agent>\x1b[0m first to register your servers.\n");
    process.exit(1);
  }

  console.log(`  Building tool cache from ${serverNames.length} server(s)...\n`);

  const result = await discoverTools(servers, {
    onServerDone: (name, toolCount, elapsedMs) => {
      const dim = "\x1b[2m";
      const green = "\x1b[32m";
      const reset = "\x1b[0m";
      console.log(`  ${green}\u2713${reset} ${name.padEnd(25)} ${String(toolCount).padStart(3)} tools   ${dim}${formatTime(elapsedMs)}${reset}`);
    },
    onServerFailed: (name, error) => {
      const red = "\x1b[31m";
      const dim = "\x1b[2m";
      const reset = "\x1b[0m";
      console.log(`  ${red}\u2717${reset} ${name.padEnd(25)} ${dim}${error}${reset}`);
    },
  });

  const successCount = result.results.filter(r => r.status === "fulfilled" && r.toolCount > 0).length;
  const failedCount = result.results.filter(r => r.status === "rejected").length;
  const skippedCount = result.results.filter(r => r.status === "skipped").length;
  const totalServers = serverNames.length - skippedCount;

  console.log("");

  if (result.tools.length === 0) {
    console.log("  No tools discovered from any server. Check your MCP configurations.\n");
    process.exit(1);
  }

  // Save cache
  const fingerprint = computeServerFingerprint(servers);
  saveToolCache(fingerprint, result.tools);

  const serverSummary = failedCount > 0
    ? `${successCount}/${totalServers} servers (${failedCount} failed)`
    : `${successCount} servers`;

  console.log(`  Cache saved: ${result.tools.length} tools from ${serverSummary} in ${formatTime(result.totalElapsedMs)}`);
  console.log("  \x1b[32mReady!\x1b[0m mcp-lazy serve will start instantly.\n");
}
