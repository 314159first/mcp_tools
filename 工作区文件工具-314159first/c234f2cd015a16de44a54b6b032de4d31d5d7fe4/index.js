#!/usr/bin/env node

import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const toolName = process.argv[2];

const toolMap = {
  "mcp-system": path.join(__dirname, "mcp_system", "index.js"),
  "mcp-command": path.join(__dirname, "mcp_command", "index.js")
};

if (!toolName || !toolMap[toolName]) {
  console.error(
    [
      "Usage: node index.js <tool-name>",
      "Supported tools:",
      "  - mcp-system",
      "  - mcp-command"
    ].join("\n")
  );
  process.exit(1);
}

const child = spawn(process.execPath, [toolMap[toolName]], {
  stdio: "inherit",
  cwd: __dirname,
  env: process.env
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});

child.on("error", (error) => {
  console.error(`Failed to start ${toolName}: ${error.message}`);
  process.exit(1);
});
