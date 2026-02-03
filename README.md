# Mobcode 🤖

<div align="center">

**A fully autonomous AI-powered mobile development environment**

[![Expo](https://img.shields.io/badge/Expo-54%2B-black.svg?style=for-the-badge&logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.81%2B-blue.svg?style=for-the-badge&logo=react)](https://reactnative.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5%2B-blue.svg?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

[Features](#features) • [Screenshots](#screenshots) • [Installation](#installation) • [Usage](#usage) • [Tech Stack](#tech-stack)

</div>

---

## ✨ Features

### 🤖 Autonomous AI Agent
- **Full Autonomy**: AI plans, executes, and verifies multi-step tasks independently
- **Smart Tool Usage**: Automatically decides when to use tools vs. conversational responses
- **Iterative Problem Solving**: Learns from failures and retries up to 3 times
- **Conversational Interface**: Natural chat experience with progress tracking

### 📁 File Management
- **Complete File Explorer**: Create, read, update, delete files and folders
- **Code Editor**: Built-in editor with syntax highlighting
- **Context Menus**: Long-press for rename, delete, and preview options
- **HTML Preview**: Live preview of HTML files using WebView

### 🔧 Development Tools
- **Tool Registry**: Extensible system for adding custom tools
- **MCP Integration**: Model Context Protocol for external tool connections
- **Code Diff Viewer**: Visual diff with apply/reject functionality
- **Task Tracker**: Real-time progress monitoring with approval checkpoints

### 🎨 User Experience
- **Theme System**: Dark and light mode support
- **Chat History**: Persistent conversations with search
- **Model Switcher**: Support for OpenAI, Anthropic, and custom APIs
- **Streaming Responses**: Real-time token streaming for faster feedback

---

## 📸 Screenshots

### Main Chat Interface
Chat with AI, track tasks, and monitor progress in real-time.

### File Explorer
Browse, create, and manage your project files directly on mobile.

### Code Diff Viewer
Review and apply code changes with visual diff highlighting.

### HTML Preview
Preview HTML files with full WebView rendering.

---

## 🚀 Installation

### Prerequisites
- Node.js 18+ and npm
- Expo Go app on your device (download from App Store/Play Store)
- Git

### Clone the Repository
```bash
git clone https://github.com/CoderVLSI/Mobcode.git
cd Mobcode
```

### Install Dependencies
```bash
npm install --legacy-peer-deps
```

### Start Development Server
```bash
npm start
```

### Run on Device
1. Open Expo Go app
2. Scan the QR code displayed in terminal
3. Or press `a` for Android emulator / `i` for iOS simulator

---

## 📖 Usage

### 1. Configure AI Models
Go to **Settings** and add your API keys:
- **OpenAI**: For GPT-4 and GPT-3.5 models
- **Anthropic**: For Claude models
- **Custom**: Add your own API endpoints (e.g., GLM-4, local models)

### 2. Start Chatting
Just type your questions or requests:
- `"Create a React Native login screen"`
- `"What files are in my project?"`
- `"Help me debug this error"`

### 3. Monitor Progress
- The task tracker badge shows pending operations
- Approval prompts appear before sensitive actions
- Final results are presented conversationally

### 4. Manage Files
- Tap the **≡** icon to open file explorer
- **Tap** files to view them
- **Long-press** for context menu (rename, delete, preview)
- Use **+** buttons to create new files/folders

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| **Framework** | Expo SDK 54 |
| **Navigation** | Expo Router (File-based routing) |
| **Language** | TypeScript |
| **UI** | React Native 0.81.5 |
| **Icons** | Ionicons |
| **File System** | Expo File System |
| **Web View** | React Native WebView |
| **Storage** | Expo Secure Store |

---

## 🔌 Available Tools

The AI agent has access to these tools:

| Tool | Description | Requires Approval |
|------|-------------|-------------------|
| `read_file` | Read file contents | ❌ |
| `write_file` | Create/update file | ✅ |
| `create_file` | Create new file | ✅ |
| `delete_file` | Delete file | ✅ |
| `list_directory` | List files in directory | ❌ |
| `search_files` | Search across files | ❌ |
| `run_command` | Execute terminal commands | ✅ |
| `find_files` | Find files by pattern | ❌ |
| `append_file` | Append to file | ✅ |
| `file_info` | Get file metadata | ❌ |
| `count_lines` | Count lines in file | ❌ |
| `list_imports` | List imports in file | ❌ |
| `create_component` | Generate React component | ✅ |
| `npm_info` | Get package info | ❌ |
| `update_package.json` | Update dependencies | ✅ |
| `init_project` | Initialize new project | ✅ |

---

## 🎯 Roadmap

- [ ] Terminal/Shell integration
- [ ] Git operations (commit, push, pull)
- [ ] Advanced code editor with IntelliSense
- [ ] Split view for code + chat
- [ ] Voice input support
- [ ] Export chat as markdown
- [ ] Custom themes
- [ ] Keyboard shortcuts (⌘K)
- [ ] Message branching
- [ ] Token usage tracking

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Cursor AI** - Inspiration for the autonomous agent concept
- **Expo Team** - Amazing React Native development platform
- **Anthropic** - Claude API for AI capabilities
- **OpenAI** - GPT models for AI capabilities

---

## 📧 Contact

- **GitHub**: [@CoderVLSI](https://github.com/CoderVLSI)
- **Repository**: [Mobcode](https://github.com/CoderVLSI/Mobcode)

---

<div align="center">

**Built with ❤️ using Expo and React Native**

[⬆ Back to Top](#mobcode-)

</div>
