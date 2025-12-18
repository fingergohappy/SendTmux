# SendTmux

<p align="center">
  <img src="log.png" alt="SendTmux Logo" width="200"/>
</p>

一个强大的 VS Code 扩展，让你能够将编辑器中选中的代码或文本直接发送到 Tmux 终端面板中执行。

非常适合 REPL 驱动开发、交互式编程、快速测试代码片段等场景。

## ✨ 主要特性

- 🚀 **快速发送** - 选中代码，一键发送到 Tmux 面板
- 🎯 **智能目标选择** - 支持选择会话(session)、窗口(window)、面板(pane)
- 📝 **历史记录** - 自动记住最近使用的目标，快速切换
- 🔄 **多种发送模式** - 支持整体发送或逐行发送
- ⚙️ **灵活配置** - 支持全局配置和工作区配置
- ✅ **自动验证** - 发送前自动验证目标是否存在
- 🔔 **友好提示** - 详细的错误提示和成功反馈

## 📦 安装要求

### Tmux 安装

此扩展需要系统已安装 Tmux：

```bash
# macOS
brew install tmux

# Ubuntu/Debian
sudo apt-get install tmux

# CentOS/RHEL
sudo yum install tmux

# Arch Linux
sudo pacman -S tmux
```

验证安装：
```bash
tmux -V
```

## 🚀 快速开始

### 1. 基本使用流程

1. 在 VS Code 编辑器中选中要执行的代码或命令
2. 按下快捷键 `Ctrl+Shift+T`（Windows/Linux）或 `Cmd+Shift+T`（macOS）
3. 从快速选择菜单中选择目标 Tmux 会话/窗口/面板
4. 选中的内容会自动发送到目标终端并执行

### 2. 使用示例

**Python REPL 开发：**
```python
# 在 VS Code 中选中这段代码
def hello(name):
    return f"Hello, {name}!"

hello("World")  # 选中后发送到 Python REPL
```

**Shell 脚本执行：**
```bash
# 选中并发送到终端
ls -la
cd ~/projects
git status
```

**Node.js 交互式开发：**
```javascript
// 发送到 Node REPL
const data = [1, 2, 3, 4, 5];
data.map(x => x * 2);
```

## 📋 命令列表

扩展提供以下命令（可通过命令面板 `Ctrl+Shift+P` / `Cmd+Shift+P` 访问）：

### 1. SendTmux: Send Selection to Tmux
- **命令 ID**: `sendtmux.sendSelection`
- **默认快捷键**: `Ctrl+Shift+T` (Windows/Linux) / `Cmd+Shift+T` (macOS)
- **功能**: 将选中的文本发送到 Tmux 目标
- **行为**:
  - 如果配置了默认目标，直接发送
  - 如果有历史记录，使用上次的目标
  - 否则弹出选择菜单

### 2. SendTmux: Send Selection with Confirmation
- **命令 ID**: `sendtmux.sendWithConfirmation`
- **功能**: 发送前始终确认目标
- **行为**: 即使有默认配置，也会弹出目标选择菜单

### 3. SendTmux: Select Tmux Target
- **命令 ID**: `sendtmux.selectTarget`
- **功能**: 选择或配置 Tmux 目标（不发送内容）
- **行为**: 打开交互式目标选择界面，选择后保存到历史记录

## ⚙️ 配置选项

在 VS Code 设置（`settings.json`）中可配置以下选项：

### 基础配置

#### `sendtmux.session`
- **类型**: `string`
- **默认值**: `""`
- **说明**: 默认的 Tmux 会话名称

#### `sendtmux.window`
- **类型**: `string`
- **默认值**: `""`
- **说明**: 默认的 Tmux 窗口编号或名称

#### `sendtmux.pane`
- **类型**: `string`
- **默认值**: `""`
- **说明**: 默认的 Tmux 面板编号

### 发送行为配置

#### `sendtmux.sendMode`
- **类型**: `"all-at-once" | "line-by-line"`
- **默认值**: `"all-at-once"`
- **说明**: 多行文本的发送方式
  - `all-at-once`: 一次性发送整个选中内容
  - `line-by-line`: 逐行发送，每行单独执行

#### `sendtmux.appendNewline`
- **类型**: `boolean`
- **默认值**: `true`
- **说明**: 是否在发送内容后自动追加换行符（回车）以执行命令

#### `sendtmux.confirmBeforeSend`
- **类型**: `boolean`
- **默认值**: `false`
- **说明**: 每次发送前是否确认目标

#### `sendtmux.rememberTarget`
- **类型**: `boolean`
- **默认值**: `true`
- **说明**: 是否记住最近使用的目标（最多记住 10 个）

## 🎯 目标格式说明

Tmux 目标可以使用以下格式：

| 格式 | 示例 | 说明 |
|------|------|------|
| `session` | `dev` | 发送到整个会话的当前面板 |
| `session:window` | `dev:0` | 发送到指定会话的指定窗口 |
| `session:window.pane` | `dev:0.1` | 发送到指定会话、窗口的指定面板 |

## 📝 配置示例

### 示例 1: 设置默认目标

适合固定工作流，总是发送到同一个面板：

```json
{
  "sendtmux.session": "dev",
  "sendtmux.window": "0",
  "sendtmux.pane": "1",
  "sendtmux.appendNewline": true
}
```

### 示例 2: Python REPL 配置

逐行发送，适合交互式编程：

```json
{
  "sendtmux.session": "python-repl",
  "sendtmux.sendMode": "line-by-line",
  "sendtmux.appendNewline": true,
  "sendtmux.rememberTarget": true
}
```

### 示例 3: 安全模式配置

每次发送前都确认，防止误操作：

```json
{
  "sendtmux.confirmBeforeSend": true,
  "sendtmux.rememberTarget": true
}
```

### 示例 4: 工作区特定配置

在 `.vscode/settings.json` 中为特定项目配置：

```json
{
  "sendtmux.session": "my-project",
  "sendtmux.window": "backend",
  "sendtmux.pane": "0",
  "sendtmux.sendMode": "all-at-once"
}
```

## ⌨️ 自定义快捷键

在 `keybindings.json` 中自定义快捷键：

### 快捷键示例

```json
[
  {
    "key": "ctrl+enter",
    "mac": "cmd+enter",
    "command": "sendtmux.sendSelection",
    "when": "editorTextFocus && editorHasSelection"
  },
  {
    "key": "ctrl+shift+enter",
    "mac": "cmd+shift+enter",
    "command": "sendtmux.sendWithConfirmation",
    "when": "editorTextFocus && editorHasSelection"
  },
  {
    "key": "ctrl+alt+t",
    "mac": "cmd+alt+t",
    "command": "sendtmux.selectTarget"
  }
]
```

## 🎬 使用场景

### 场景 1: Python 数据分析

```python
# 1. 启动 Tmux 和 IPython
tmux new -s data-analysis
ipython

# 2. 在 VS Code 中编写和测试代码
import pandas as pd
import numpy as np

df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
df.describe()  # 选中并发送
```

### 场景 2: Shell 脚本调试

```bash
# 逐步执行脚本的各个部分
cd /var/log
tail -f syslog  # 选中发送
grep "error" syslog | head -10  # 选中发送
```

### 场景 3: Node.js 开发

```javascript
// 发送到 Node REPL 进行快速测试
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});
```

### 场景 4: 多服务开发

使用不同的 Tmux 面板运行不同的服务：

- 面板 0: 数据库
- 面板 1: 后端 API
- 面板 2: 前端开发服务器
- 面板 3: 日志监控

通过扩展向不同面板发送命令。

## 🔧 高级功能

### 交互式目标选择

当你执行发送命令时，扩展会显示一个智能选择菜单：

1. **最近使用的目标** - 显示历史记录，快速选择
2. **可用的 Tmux 会话** - 列出所有运行中的会话
3. **自定义目标** - 手动输入目标字符串
4. **逐级选择** - 先选会话，再选窗口，最后选面板

### 目标验证

发送前自动验证：
- ✅ Tmux 是否已安装
- ✅ 目标会话是否存在
- ✅ 目标窗口和面板是否有效
- ❌ 如果目标不存在，显示错误提示

### 错误处理

- 未安装 Tmux：显示安装指引
- 未选中文本：友好提示
- 目标不存在：显示目标字符串和建议
- 命令执行失败：显示详细错误信息

## 🐛 已知问题

目前没有已知问题。如果遇到问题，请在 GitHub 仓库提交 Issue。

## 📜 更新日志

### 0.0.1 (Initial Release)

初始版本发布，包含以下功能：

- ✅ 发送选中文本到 Tmux 面板
- ✅ 智能目标选择系统
- ✅ 历史记录功能（最多 10 个）
- ✅ 两种发送模式（整体/逐行）
- ✅ 完整的错误处理和验证
- ✅ 丰富的配置选项
- ✅ 自定义快捷键支持
- ✅ 工作区配置支持

## 🤝 贡献

欢迎贡献代码、报告问题或提出新功能建议！

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有使用和支持这个项目的开发者！

---

**享受高效的 Tmux 集成开发体验！** 🚀

