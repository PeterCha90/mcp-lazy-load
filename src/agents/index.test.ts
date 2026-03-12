import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  AGENTS,
  getAgentByName,
  registerProxy,
  isProxyRegistered,
  type AgentInfo,
} from "./index.js";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("agents", () => {
  describe("AGENTS array", () => {
    it("contains cursor agent", () => {
      const cursor = AGENTS.find((a) => a.name === "cursor");
      expect(cursor).toBeDefined();
      expect(cursor!.displayName).toBe("Cursor");
      expect(cursor!.configPaths.length).toBeGreaterThan(0);
    });

    it("contains windsurf agent", () => {
      const windsurf = AGENTS.find((a) => a.name === "windsurf");
      expect(windsurf).toBeDefined();
      expect(windsurf!.displayName).toBe("Windsurf");
    });

    it("contains opencode agent", () => {
      const opencode = AGENTS.find((a) => a.name === "opencode");
      expect(opencode).toBeDefined();
      expect(opencode!.displayName).toBe("Opencode");
    });

    it("contains antigravity agent", () => {
      const ag = AGENTS.find((a) => a.name === "antigravity");
      expect(ag).toBeDefined();
      expect(ag!.displayName).toBe("Antigravity");
    });

    it("contains claude-code agent with note", () => {
      const claude = AGENTS.find((a) => a.name === "claude-code");
      expect(claude).toBeDefined();
      expect(claude!.displayName).toBe("Claude Code");
      expect(claude!.note).toBeDefined();
      expect(claude!.note).toContain("lazy loading");
    });

    it("contains codex agent", () => {
      const codex = AGENTS.find((a) => a.name === "codex");
      expect(codex).toBeDefined();
      expect(codex!.displayName).toBe("Codex");
      expect(codex!.format).toBe("toml");
      expect(codex!.configPaths).toContain(".codex/config.toml");
    });

    it("has at least 6 agents", () => {
      expect(AGENTS.length).toBeGreaterThanOrEqual(6);
    });

    it("every agent has required fields", () => {
      for (const agent of AGENTS) {
        expect(agent.name).toBeTruthy();
        expect(agent.displayName).toBeTruthy();
        expect(agent.configPaths.length).toBeGreaterThan(0);
      }
    });
  });

  describe("getAgentByName", () => {
    it("returns correct agent for known name", () => {
      const cursor = getAgentByName("cursor");
      expect(cursor).toBeDefined();
      expect(cursor!.name).toBe("cursor");
      expect(cursor!.displayName).toBe("Cursor");
    });

    it("returns undefined for unknown name", () => {
      expect(getAgentByName("nonexistent-agent")).toBeUndefined();
    });

    it("returns undefined for empty string", () => {
      expect(getAgentByName("")).toBeUndefined();
    });

    it("is case-sensitive", () => {
      expect(getAgentByName("Cursor")).toBeUndefined();
      expect(getAgentByName("CURSOR")).toBeUndefined();
    });
  });

  describe("registerProxy", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "mcp-lazy-test-"));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it("creates config file with mcp-lazy entry when none exists", () => {
      const configPath = join(tempDir, "mcp.json");
      const agent: AgentInfo = {
        name: "test-agent",
        displayName: "Test Agent",
        configPaths: [configPath],
      };

      const result = registerProxy(agent, "/path/to/mcp-lazy-config.json");

      expect(result.created).toBe(true);
      expect(result.configPath).toBe(configPath);

      const written = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(written.mcpServers).toBeDefined();
      expect(written.mcpServers["mcp-lazy"]).toBeDefined();
      expect(written.mcpServers["mcp-lazy"].command).toBe("npx");
      expect(written.mcpServers["mcp-lazy"].args).toContain("mcp-lazy");
      expect(written.mcpServers["mcp-lazy"].args).toContain("/path/to/mcp-lazy-config.json");
    });

    it("updates existing config file preserving other servers", () => {
      const configPath = join(tempDir, "mcp.json");
      const existingConfig = {
        mcpServers: {
          "existing-server": {
            command: "existing-cmd",
            args: [],
          },
        },
      };
      writeFileSync(configPath, JSON.stringify(existingConfig));

      const agent: AgentInfo = {
        name: "test-agent",
        displayName: "Test Agent",
        configPaths: [configPath],
      };

      const result = registerProxy(agent, "/path/to/config.json");

      expect(result.created).toBe(false);

      const written = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(written.mcpServers["existing-server"]).toBeDefined();
      expect(written.mcpServers["mcp-lazy"]).toBeDefined();
    });

    it("creates parent directories when needed", () => {
      const nestedPath = join(tempDir, "deep", "nested", "mcp.json");
      const agent: AgentInfo = {
        name: "test-agent",
        displayName: "Test Agent",
        configPaths: [nestedPath],
      };

      const result = registerProxy(agent, "/config.json");
      expect(result.created).toBe(true);

      const written = JSON.parse(readFileSync(nestedPath, "utf-8"));
      expect(written.mcpServers["mcp-lazy"]).toBeDefined();
    });

    it("overwrites mcp-lazy entry if already present", () => {
      const configPath = join(tempDir, "mcp.json");
      const existingConfig = {
        mcpServers: {
          "mcp-lazy": {
            command: "old-npx",
            args: ["old-args"],
          },
        },
      };
      writeFileSync(configPath, JSON.stringify(existingConfig));

      const agent: AgentInfo = {
        name: "test-agent",
        displayName: "Test Agent",
        configPaths: [configPath],
      };

      registerProxy(agent, "/new/config.json");

      const written = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(written.mcpServers["mcp-lazy"].command).toBe("npx");
      expect(written.mcpServers["mcp-lazy"].args).toContain("/new/config.json");
    });

    it("creates TOML config file for codex agent", () => {
      const configPath = join(tempDir, "config.toml");
      const agent: AgentInfo = {
        name: "codex",
        displayName: "Codex",
        configPaths: [configPath],
        format: "toml",
      };

      const result = registerProxy(agent, "./mcp-lazy-config.json");

      expect(result.created).toBe(true);
      expect(result.configPath).toBe(configPath);

      const content = readFileSync(configPath, "utf-8");
      expect(content).toContain("[mcp_servers.mcp-lazy]");
      expect(content).toContain('command = "npx"');
      expect(content).toContain("mcp-lazy-config.json");
    });

    it("appends TOML block to existing TOML config", () => {
      const configPath = join(tempDir, "config.toml");
      writeFileSync(configPath, '[other_section]\nkey = "value"\n');

      const agent: AgentInfo = {
        name: "codex",
        displayName: "Codex",
        configPaths: [configPath],
        format: "toml",
      };

      const result = registerProxy(agent, "./mcp-lazy-config.json");

      expect(result.created).toBe(false);

      const content = readFileSync(configPath, "utf-8");
      expect(content).toContain('[other_section]');
      expect(content).toContain("[mcp_servers.mcp-lazy]");
    });

    it("handles corrupt existing file gracefully", () => {
      const configPath = join(tempDir, "mcp.json");
      writeFileSync(configPath, "not valid json {{{");

      const agent: AgentInfo = {
        name: "test-agent",
        displayName: "Test Agent",
        configPaths: [configPath],
      };

      const result = registerProxy(agent, "/config.json");
      expect(result.created).toBe(false);

      const written = JSON.parse(readFileSync(configPath, "utf-8"));
      expect(written.mcpServers["mcp-lazy"]).toBeDefined();
    });
  });

  describe("isProxyRegistered", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "mcp-lazy-test-"));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    it("returns true when mcp-lazy is registered", () => {
      const configPath = join(tempDir, "mcp.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          mcpServers: {
            "mcp-lazy": { command: "npx", args: ["mcp-lazy", "serve"] },
          },
        })
      );

      const agent: AgentInfo = {
        name: "test",
        displayName: "Test",
        configPaths: [configPath],
      };

      expect(isProxyRegistered(agent)).toBe(true);
    });

    it("returns false when config exists but mcp-lazy is not registered", () => {
      const configPath = join(tempDir, "mcp.json");
      writeFileSync(
        configPath,
        JSON.stringify({
          mcpServers: {
            "other-server": { command: "other", args: [] },
          },
        })
      );

      const agent: AgentInfo = {
        name: "test",
        displayName: "Test",
        configPaths: [configPath],
      };

      expect(isProxyRegistered(agent)).toBe(false);
    });

    it("returns false when config file does not exist", () => {
      const agent: AgentInfo = {
        name: "test",
        displayName: "Test",
        configPaths: [join(tempDir, "nonexistent.json")],
      };

      expect(isProxyRegistered(agent)).toBe(false);
    });

    it("returns false when config file is invalid JSON", () => {
      const configPath = join(tempDir, "mcp.json");
      writeFileSync(configPath, "invalid json");

      const agent: AgentInfo = {
        name: "test",
        displayName: "Test",
        configPaths: [configPath],
      };

      expect(isProxyRegistered(agent)).toBe(false);
    });

    it("returns false when mcpServers key is missing", () => {
      const configPath = join(tempDir, "mcp.json");
      writeFileSync(configPath, JSON.stringify({ other: "data" }));

      const agent: AgentInfo = {
        name: "test",
        displayName: "Test",
        configPaths: [configPath],
      };

      expect(isProxyRegistered(agent)).toBe(false);
    });
  });
});
