# mcp_system

Workspace MCP tool for AgentX.  
AgentX 的工作区 MCP 工具，负责系统信息、目录查看和文件读写。

## Features / 功能说明

- `system_info`: return host runtime information / 获取当前机器运行环境信息
- `echo_message`: echo input text with a timestamp / 原样返回消息并附带时间戳
- `pwd`: return the current working directory / 获取当前工作目录
- `list_dir`: list files and folders in a directory / 查看目录下的文件和文件夹
- `read_file`: read a UTF-8 text file / 读取 UTF-8 文本文件
- `write_file`: write a UTF-8 text file / 写入 UTF-8 文本文件
- `mkdir`: create a directory recursively / 递归创建目录

## Why This Design / 设计思路

Originally, `system` and `files` were considered separate tools.  
最初我把 `system` 和 `files` 设计成两个工具。

After reconsidering the actual workflow, they fit better as one workspace-oriented tool:  
后来重新梳理后发现，它们更适合合并成一个“工作区工具”：

- directory browsing and file reading naturally belong together / 查看目录和读文件本来就是一套动作
- writing files often needs path inspection first / 写文件之前通常也要先看目录结构
- keeping them together reduces tool count and makes tool selection simpler / 合并后工具数量更少，AI 选择工具也更直接

So the current recommendation is:  
所以现在建议这样拆分：

- `mcp_system`: workspace and file operations / 工作区与文件操作
- `mcp_command`: command execution and deployment / 命令执行与部署

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

## Tool Examples / 工具调用示例

### `pwd`

```json
{}
```

### `list_dir`

```json
{
  "dir": "."
}
```

### `read_file`

```json
{
  "filePath": "src/index.html"
}
```

### `write_file`

```json
{
  "filePath": "site/index.html",
  "content": "<!doctype html><html><body>Hello</body></html>"
}
```

### `mkdir`

```json
{
  "dirPath": "site/assets"
}
```
