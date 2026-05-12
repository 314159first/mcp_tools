# mcp_system

Minimal MCP stdio server for testing AgentX tool upload.

## Features

- `system_info`: return host runtime information
- `echo_message`: echo input text with a timestamp
- `pwd`: return the current working directory
- `list_dir`: list files and folders in a directory

## Requirements

- Node.js 18+

## Install

```bash
npm install
```

## Run

```bash
npm start
```

## Tool Examples

`pwd`

```json
{}
```

`list_dir`

```json
{
  "dir": "."
}
```

## AgentX upload

GitHub URL:

```text
https://github.com/314159first/mcp_system
```

Install command example:

```json
{
  "mcpServers": {
    "mcp-system": {
      "command": "npx.cmd",
      "args": [
        "-y",
        "github:314159first/mcp_system"
      ]
    }
  }
}
```

If your MCP runtime does not support direct GitHub execution through `npx`, clone the repo locally first and point the command to the local entry file.
