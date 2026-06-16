#!/usr/bin/env node

import os from "node:os";
import fs from "node:fs/promises";
import path from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

const WORKSPACE_ROOT = process.cwd();
const MAX_FILE_SIZE = 1024 * 1024;

const server = new Server(
  {
    name: "mcp-system",
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

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "system_info",
      description: "Return basic runtime information about the current machine.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: "echo_message",
      description: "Echo the provided message with a timestamp.",
      inputSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "The message to echo."
          }
        },
        required: ["message"],
        additionalProperties: false
      }
    },
    {
      name: "pwd",
      description: "Return the current working directory of the MCP server process.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: "list_dir",
      description: "List files and folders in the provided directory. Defaults to the current working directory.",
      inputSchema: {
        type: "object",
        properties: {
          dir: {
            type: "string",
            description: "Directory path to inspect. Can be absolute or relative to the workspace root."
          }
        },
        additionalProperties: false
      }
    },
    {
      name: "read_file",
      description: "Read a UTF-8 text file from the workspace.",
      inputSchema: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "File path to read. Can be absolute or relative to the workspace root."
          }
        },
        required: ["filePath"],
        additionalProperties: false
      }
    },
    {
      name: "write_file",
      description: "Write a UTF-8 text file inside the workspace, creating parent directories if needed.",
      inputSchema: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description: "File path to write. Can be absolute or relative to the workspace root."
          },
          content: {
            type: "string",
            description: "Text content to write."
          }
        },
        required: ["filePath", "content"],
        additionalProperties: false
      }
    },
    {
      name: "mkdir",
      description: "Create a directory inside the workspace.",
      inputSchema: {
        type: "object",
        properties: {
          dirPath: {
            type: "string",
            description: "Directory path to create. Can be absolute or relative to the workspace root."
          }
        },
        required: ["dirPath"],
        additionalProperties: false
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  if (name === "system_info") {
    return {
      content: [
        {
          type: "text",
          text: formatJson({
            platform: os.platform(),
            release: os.release(),
            arch: os.arch(),
            hostname: os.hostname(),
            nodeVersion: process.version
          })
        }
      ]
    };
  }

  if (name === "echo_message") {
    const message = typeof args.message === "string" ? args.message : "";
    return {
      content: [
        {
          type: "text",
          text: `[${new Date().toISOString()}] ${message}`
        }
      ]
    };
  }

  if (name === "pwd") {
    return {
      content: [
        {
          type: "text",
          text: process.cwd()
        }
      ]
    };
  }

  if (name === "list_dir") {
    const dirArg = typeof args.dir === "string" && args.dir.trim() !== "" ? args.dir.trim() : ".";
    const targetDir = resolveWorkspacePath(dirArg);
    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    const result = await Promise.all(
      entries
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(async (entry) => {
          const fullPath = path.join(targetDir, entry.name);
          const stat = await fs.stat(fullPath);
          return {
            name: entry.name,
            type: entry.isDirectory() ? "directory" : "file",
            size: entry.isDirectory() ? null : stat.size
          };
        })
    );

    return {
      content: [
        {
          type: "text",
          text: formatJson({
            directory: targetDir,
            entries: result
          })
        }
      ]
    };
  }

  if (name === "read_file") {
    const filePath = typeof args.filePath === "string" ? args.filePath.trim() : "";
    if (!filePath) {
      throw new Error("filePath is required");
    }

    const targetFile = resolveWorkspacePath(filePath);
    const stat = await fs.stat(targetFile);
    if (stat.size > MAX_FILE_SIZE) {
      throw new Error(`File is too large to read safely (${stat.size} bytes)`);
    }

    const content = await fs.readFile(targetFile, "utf8");
    return {
      content: [
        {
          type: "text",
          text: formatJson({
            filePath: targetFile,
            size: stat.size,
            content
          })
        }
      ]
    };
  }

  if (name === "write_file") {
    const filePath = typeof args.filePath === "string" ? args.filePath.trim() : "";
    if (!filePath) {
      throw new Error("filePath is required");
    }

    const content = typeof args.content === "string" ? args.content : "";
    const targetFile = resolveWorkspacePath(filePath);
    await fs.mkdir(path.dirname(targetFile), { recursive: true });
    await fs.writeFile(targetFile, content, "utf8");

    return {
      content: [
        {
          type: "text",
          text: formatJson({
            filePath: targetFile,
            bytesWritten: Buffer.byteLength(content, "utf8")
          })
        }
      ]
    };
  }

  if (name === "mkdir") {
    const dirPath = typeof args.dirPath === "string" ? args.dirPath.trim() : "";
    if (!dirPath) {
      throw new Error("dirPath is required");
    }

    const targetDir = resolveWorkspacePath(dirPath);
    await fs.mkdir(targetDir, { recursive: true });

    return {
      content: [
        {
          type: "text",
          text: formatJson({
            dirPath: targetDir,
            created: true
          })
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
