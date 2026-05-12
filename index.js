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
            description: "Directory path to inspect. Can be absolute or relative."
          }
        },
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
          text: JSON.stringify(
            {
              platform: os.platform(),
              release: os.release(),
              arch: os.arch(),
              hostname: os.hostname(),
              nodeVersion: process.version
            },
            null,
            2
          )
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
    const targetDir = path.resolve(process.cwd(), dirArg);
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
          text: JSON.stringify(
            {
              directory: targetDir,
              entries: result
            },
            null,
            2
          )
        }
      ]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
