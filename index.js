#!/usr/bin/env node

import os from "node:os";
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

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
