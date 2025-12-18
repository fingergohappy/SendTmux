# SendTmux

<p align="center">
  <img src="log.png" alt="SendTmux Logo" width="200"/>
</p>

A powerful VS Code extension that allows you to send selected code or text directly from the editor to a Tmux terminal pane.

Perfect for REPL-driven development, interactive programming, and quickly testing code snippets.

## ✨ Key Features

- 🚀 **Quick Send** - Select code and send it to a Tmux pane with one click
- 🎯 **Smart Target Selection** - Support for selecting session, window, and pane
- 📝 **History** - Automatically remembers recently used targets for quick switching
- 🔄 **Multiple Send Modes** - Support for sending text all-at-once or line-by-line
- ⚙️ **Flexible Configuration** - Support for global and workspace settings
- ✅ **Auto Validation** - Automatically verifies if the target exists before sending
- 🔔 **Friendly Feedback** - Detailed error messages and success notifications

## 📦 Requirements

### Tmux Installation

This extension requires Tmux to be installed on your system:

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

Verify installation:
```bash
tmux -V
```

## 🚀 Quick Start

### 1. Basic Workflow

1. Select the code or command you want to execute in the VS Code editor.
2. Press `Ctrl+Shift+T` (Windows/Linux) or `Cmd+Shift+T` (macOS).
3. Select the target Tmux session/window/pane from the quick pick menu.
4. The selected content will be automatically sent to the target terminal and executed.

### 2. Usage Examples

**Python REPL Development:**
```python
# Select this code in VS Code
def hello(name):
    return f"Hello, {name}!"

hello("World")  # Select and send to Python REPL
```

**Shell Script Execution:**
```bash
# Select and send to terminal
ls -la
cd ~/projects
git status
```

**Node.js Interactive Development:**
```javascript
// Send to Node REPL
const data = [1, 2, 3, 4, 5];
data.map(x => x * 2);
```

## 📋 Command List

The extension provides the following commands (accessible via Command Palette `Ctrl+Shift+P` / `Cmd+Shift+P`):

### 1. SendTmux: Send Selection to Tmux
- **Command ID**: `sendtmux.sendSelection`
- **Default Shortcut**: `Ctrl+Shift+T` (Windows/Linux) / `Cmd+Shift+T` (macOS)
- **Function**: Sends selected text to the Tmux target
- **Behavior**:
  - Sends directly if a default target is configured
  - Uses the last target if history exists
  - Otherwise, opens the selection menu

### 2. SendTmux: Send Selection with Confirmation
- **Command ID**: `sendtmux.sendWithConfirmation`
- **Function**: Always confirms the target before sending
- **Behavior**: Opens the target selection menu even if a default is configured

### 3. SendTmux: Select Tmux Target
- **Command ID**: `sendtmux.selectTarget`
- **Function**: Selects or configures a Tmux target (without sending)
- **Behavior**: Opens the interactive target selection interface and saves the selection to history

## ⚙️ Configuration Options

Configure the following options in VS Code settings (`settings.json`):

### Basic Configuration

#### `sendtmux.session`
- **Type**: `string`
- **Default**: `""`
- **Description**: Default Tmux session name

#### `sendtmux.window`
- **Type**: `string`
- **Default**: `""`
- **Description**: Default Tmux window index or name

#### `sendtmux.pane`
- **Type**: `string`
- **Default**: `""`
- **Description**: Default Tmux pane index

### Send Behavior Configuration

#### `sendtmux.sendMode`
- **Type**: `"all-at-once" | "line-by-line"`
- **Default**: `"all-at-once"`
- **Description**: How multi-line text is sent
  - `all-at-once`: Sends the entire selection at once
  - `line-by-line`: Sends line-by-line, executing each separately

#### `sendtmux.appendNewline`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to automatically append a newline (Enter) after sending content to execute the command

#### `sendtmux.confirmBeforeSend`
- **Type**: `boolean`
- **Default**: `false`
- **Description**: Whether to confirm the target before every send

#### `sendtmux.rememberTarget`
- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to remember recently used targets (up to 10)

## 🎯 Target Format

Tmux targets can use the following formats:

| Format | Example | Description |
|------|------|------|
| `session` | `dev` | Sends to the current pane of the entire session |
| `session:window` | `dev:0` | Sends to a specific window of a specific session |
| `session:window.pane` | `dev:0.1` | Sends to a specific pane of a specific window and session |

## 📝 Configuration Examples

### Example 1: Set Default Target
Suitable for fixed workflows where you always send to the same pane:
```json
{
  "sendtmux.session": "dev",
  "sendtmux.window": "0",
  "sendtmux.pane": "1",
  "sendtmux.appendNewline": true
}
```

### Example 2: Python REPL Configuration
Line-by-line sending, perfect for interactive programming:
```json
{
  "sendtmux.session": "python-repl",
  "sendtmux.sendMode": "line-by-line",
  "sendtmux.appendNewline": true,
  "sendtmux.rememberTarget": true
}
```

### Example 3: Safe Mode Configuration
Always confirm before sending to prevent accidental operations:
```json
{
  "sendtmux.confirmBeforeSend": true,
  "sendtmux.rememberTarget": true
}
```

### Example 4: Workspace Specific Configuration
Configure for a specific project in `.vscode/settings.json`:
```json
{
  "sendtmux.session": "my-project",
  "sendtmux.window": "backend",
  "sendtmux.pane": "0",
  "sendtmux.sendMode": "all-at-once"
}
```

## ⌨️ Custom Keybindings

Customize keybindings in `keybindings.json`:

### Example Keybindings
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

## 🎬 Use Cases

### Case 1: Python Data Analysis
```python
# 1. Start Tmux and IPython
tmux new -s data-analysis
ipython

# 2. Write and test code in VS Code
import pandas as pd
import numpy as np

df = pd.DataFrame({'a': [1, 2, 3], 'b': [4, 5, 6]})
df.describe()  # Select and send
```

### Case 2: Shell Script Debugging
```bash
# Execute script parts step-by-step
cd /var/log
tail -f syslog  # Select and send
grep "error" syslog | head -10  # Select and send
```

### Case 3: Node.js Development
```javascript
// Send to Node REPL for quick testing
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello World!');
});
```

### Case 4: Multi-service Development
Run different services in different Tmux panes:
- Pane 0: Database
- Pane 1: Backend API
- Pane 2: Frontend dev server
- Pane 3: Log monitoring

Send commands to different panes via the extension.

## 🔧 Advanced Features

### Interactive Target Selection
When you execute the send command, the extension shows a smart selection menu:
1. **Recent Targets** - Shows history for quick selection
2. **Available Sessions** - Lists all running Tmux sessions
3. **Custom Target** - Manually input a target string
4. **Step-by-step Selection** - Select session first, then window, then pane

### Target Validation
Automatically validates before sending:
- ✅ Is Tmux installed
- ✅ Does the target session exist
- ✅ Are the target window and pane valid
- ❌ Shows error message if target is not found

### Error Handling
- Tmux not installed: Shows installation guide
- No text selected: Friendly reminder
- Target not found: Shows target string and suggestions
- Command execution failure: Shows detailed error information

## 🐛 Known Issues
None at the moment. Please submit an Issue on GitHub if you encounter any.

## 📜 Changelog

### 0.0.1 (Initial Release)
Initial version released with:
- ✅ Send selected text to Tmux pane
- ✅ Smart target selection system
- ✅ History (up to 10 entries)
- ✅ Two send modes (all-at-once/line-by-line)
- ✅ Complete error handling and validation
- ✅ Rich configuration options
- ✅ Custom keybindings support
- ✅ Workspace configuration support

## 🤝 Contributing
Contributions, bug reports, and feature requests are welcome!

## 📄 License
MIT License

## 🙏 Acknowledgements
Thanks to all developers for using and supporting this project!

---

**Enjoy a highly efficient Tmux integrated development experience!** 🚀
