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
    args: [serverPath, "mcp-system"],
    env: {
      ...process.env,
      MCP_WORKSPACE_ROOT: workspaceRoot
    },
    stderr: "pipe"
  });
  const client = new Client({ name: "mcp-system-test", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

function textContent(result) {
  assert.equal(result.isError, undefined);
  assert.equal(result.content.length, 1);
  assert.equal(result.content[0].type, "text");
  return result.content[0].text;
}

test("uses MCP_WORKSPACE_ROOT for persistent file operations", async (t) => {
  const temporaryRoot = await fs.mkdtemp(path.join(os.tmpdir(), "mcp-system-test-"));
  const workspaceRoot = path.join(temporaryRoot, "workspace");
  t.after(() => fs.rm(temporaryRoot, { recursive: true, force: true }));

  let client = await createClient(workspaceRoot);
  assert.equal(textContent(await client.callTool({ name: "pwd", arguments: {} })), workspaceRoot);

  await client.callTool({
    name: "write_file",
    arguments: { filePath: "notes/status.txt", content: "persistent workspace" }
  });
  await client.callTool({ name: "mkdir", arguments: { dirPath: "artifacts/output" } });

  const listing = JSON.parse(textContent(await client.callTool({ name: "list_dir", arguments: { dir: "." } })));
  assert.equal(listing.directory, workspaceRoot);
  assert.deepEqual(
    listing.entries.map((entry) => entry.name),
    ["artifacts", "notes"]
  );

  await assert.rejects(
    client.callTool({ name: "read_file", arguments: { filePath: "../outside.txt" } }),
    /Path escapes workspace root/
  );
  await client.close();

  client = await createClient(workspaceRoot);
  t.after(() => client.close());
  const file = JSON.parse(
    textContent(await client.callTool({ name: "read_file", arguments: { filePath: "notes/status.txt" } }))
  );
  assert.equal(file.filePath, path.join(workspaceRoot, "notes/status.txt"));
  assert.equal(file.content, "persistent workspace");
});
