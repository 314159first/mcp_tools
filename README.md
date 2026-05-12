# mcp_tools

Monorepo for AgentX MCP tools.  
一个用于管理多个 AgentX MCP 工具的统一仓库。

## Included Tools / 包含的工具

- `mcp_system`: workspace and file operations / 工作区与文件操作
- `mcp_command`: command execution / 命令执行

## Repository Structure / 仓库结构

```text
mcp_tools/
  index.js
  package.json
  README.md
  .gitignore
  mcp_system/
    index.js
    package.json
    README.md
    .gitignore
  mcp_command/
    index.js
    package.json
    README.md
    .gitignore
```

## Why Use One Repo / 为什么用一个仓库

- easier maintenance / 更容易统一维护
- shared versioning and documentation / 文档和版本集中管理
- multiple tools can still be uploaded separately in AgentX / 在 AgentX 中仍然可以作为多个独立工具上传

## Local Run / 本地运行

Start `mcp_system`:

```bash
node index.js mcp-system
```

启动 `mcp_system`：

```bash
node index.js mcp-system
```

Start `mcp_command`:

```bash
node index.js mcp-command
```

启动 `mcp_command`：

```bash
node index.js mcp-command
```

## AgentX Upload / 在 AgentX 中上传

GitHub URL:

```text
https://github.com/314159first/mcp_tools
```

### Upload `mcp_system`

```json
{
  "mcpServers": {
    "mcp-system": {
      "command": "npx",
      "args": [
        "-y",
        "github:314159first/mcp_tools",
        "mcp-system"
      ]
    }
  }
}
```

### Upload `mcp_command`

```json
{
  "mcpServers": {
    "mcp-command": {
      "command": "npx",
      "args": [
        "-y",
        "github:314159first/mcp_tools",
        "mcp-command"
      ]
    }
  }
}
```

## Notes / 说明

`mcp_system` and `mcp_command` are uploaded as two separate tools in AgentX, even though they live in the same repository.  
虽然 `mcp_system` 和 `mcp_command` 放在同一个仓库里，但在 AgentX 中仍然应该作为两个独立工具上传。
