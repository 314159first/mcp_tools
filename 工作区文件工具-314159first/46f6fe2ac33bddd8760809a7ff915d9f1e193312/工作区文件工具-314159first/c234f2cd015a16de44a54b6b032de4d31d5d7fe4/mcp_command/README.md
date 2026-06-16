# mcp_command

MCP command runner for AgentX.  
AgentX 的命令执行 MCP 工具，适合构建、启动和部署任务。

## Features / 功能说明

- `run_command`: run a command in the workspace and return stdout, stderr, timeout state, and exit code / 在工作区执行命令，并返回标准输出、错误输出、超时状态和退出码

## Why This Tool Stays Separate / 为什么它单独拆分

Command execution is much more powerful and risky than simple file reading and writing.  
命令执行能力相比文件读写更强，也更敏感。

So it is better to keep it separate from workspace browsing:  
所以更适合和工作区浏览能力分开：

- easier permission management / 更容易做权限管理
- easier auditing / 更容易审计问题
- users can install it only when deployment is needed / 只有需要构建或部署时才安装

## Requirements / 环境要求

- Node.js 18+

## Install / 安装依赖

```bash
npm install
```

## Run / 本地启动

```bash
npm start
```

## Tool Example / 工具调用示例

```json
{
  "command": "npm",
  "args": ["run", "build"],
  "cwd": "site",
  "timeoutMs": 120000
}
```
