import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const serverPath = path.join(repositoryRoot, "index.js");

async function createClient(workspaceRoot) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath, "mcp-command"],
    env: {
      ...process.env,
      MCP_WORKSPACE_ROOT: workspaceRoot,
      MCP_COMMAND_TEST_VALUE: "available"
    },
    stderr: "pipe"
  });
  const client = new Client({ name: "mcp-command-test", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

function commandResult(result) {
  assert.equal(result.isError, undefined);
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].type, "text");
  return JSON.parse(result.content[0].text);
}

test("runs commands only inside MCP_WORKSPACE_ROOT", async (t) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-command-test-"));
  const workspaceRoot = path.join(temporaryRoot, "workspace");
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));

  const client = await createClient(workspaceRoot);
  t.after(() => client.close());

  const result = commandResult(
    await client.callTool({
      name: "run_command",
      arguments: {
        command: process.execPath,
        args: [
          "-e",
          "console.log(JSON.stringify({ cwd: process.cwd(), value: process.env.MCP_COMMAND_TEST_VALUE })); process.exit(7)"
        ]
      }
    })
  );

  assert.equal(result.cwd, workspaceRoot);
  assert.equal(result.exitCode, 7);
  assert.equal(result.timedOut, false);
  assert.deepEqual(JSON.parse(result.stdout), { cwd: workspaceRoot, value: "available" });
  await fs.access(workspaceRoot);

  await assert.rejects(
    client.callTool({
      name: "run_command",
      arguments: { command: process.execPath, args: ["--version"], cwd: "../outside" }
    }),
    /Path escapes workspace root/
  );
});
