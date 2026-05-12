#!/usr/bin/env node

import path from "node:path";
import { spawn } from "node:child_process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const WORKSPACE_ROOT = process.cwd();
const DEFAULT_COMMAND_TIMEOUT_MS = 120000;

const server = new Server(
  {
    name: "mcp-command",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

function resolveWorkspacePath(targetPath = ".") {
  const resolvedPath = path.resolve(WORKSPACE_ROOT, targetPath);
  const relativePath = path.relative(WORKSPACE_ROOT, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Path escapes workspace root: ${targetPath}`);
  }

  return resolvedPath;
}

function formatJson(value) {
  return JSON.stringify(value, null, 2);
}

async function runCommand(command, args = [], cwd = ".", timeoutMs = DEFAULT_COMMAND_TIMEOUT_MS) {
  const commandArgs = Array.isArray(args) ? args.map((arg) => String(arg)) : [];
  const commandCwd = resolveWorkspacePath(typeof cwd === "string" && cwd.trim() !== "" ? cwd.trim() : ".");
  const effectiveTimeout = Math.min(
    Math.max(Number.isFinite(timeoutMs) ? Number(timeoutMs) : DEFAULT_COMMAND_TIMEOUT_MS, 1),
    300000
  );

  return await new Promise((resolve) => {
    const child = spawn(command, commandArgs, {
      cwd: commandCwd,
      shell: process.platform === "win32",
      env: process.env
    });

    let stdout = "";
    let stderr = "";
    let finished = false;

    const timer = setTimeout(() => {
      if (finished) {
        return;
      }
      finished = true;
      child.kill();
      resolve({
        command,
        args: commandArgs,
        cwd: commandCwd,
        timedOut: true,
        exitCode: null,
        stdout,
        stderr
      });
    }, effectiveTimeout);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      resolve({
        command,
        args: commandArgs,
        cwd: commandCwd,
        timedOut: false,
        exitCode: null,
        stdout,
        stderr: stderr ? `${stderr}\n${error.message}` : error.message
      });
    });

    child.on("close", (code) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      resolve({
        command,
        args: commandArgs,
        cwd: commandCwd,
        timedOut: false,
        exitCode: code,
        stdout,
        stderr
      });
    });
  });
}

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "run_command",
      description: "Run a command in the workspace and return stdout, stderr, and exit code.",
      inputSchema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Executable to run, such as npm, node, git, or a project-local command."
          },
          args: {
            type: "array",
            description: "Command arguments.",
            items: {
              type: "string"
            }
          },
          cwd: {
            type: "string",
            description: "Optional working directory. Defaults to the workspace root."
          },
          timeoutMs: {
            type: "number",
            description: "Optional timeout in milliseconds. Defaults to 120000 and is capped at 300000."
          }
        },
        required: ["command"],
        additionalProperties: false
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  if (name === "run_command") {
    const command = typeof args.command === "string" ? args.command.trim() : "";
    if (!command) {
      throw new Error("command is required");
    }

    const result = await runCommand(command, args.args, args.cwd, args.timeoutMs);
    return {
      content: [
        {
          type: "text",
          text: formatJson(result)
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
