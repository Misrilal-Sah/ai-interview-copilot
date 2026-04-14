<div align="center">

<!-- Animated banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,50:16213e,100:0f3460&height=200&section=header&text=AI%20Interview%20Copilot&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=Your%20invisible%20AI%20overlay%20for%20any%20screen&descAlignY=58&descSize=18&descColor=a0aec0&animation=fadeIn" width="100%" />

<br/>

<!-- Badges row 1 -->
<a href="https://github.com/Misrilal-Sah/ai-interview-copilot/stargazers"><img src="https://img.shields.io/github/stars/Misrilal-Sah/ai-interview-copilot?style=for-the-badge&logo=starship&color=FFD700&labelColor=0f3460" alt="Stars"/></a>
&nbsp;
<a href="https://github.com/Misrilal-Sah/ai-interview-copilot/network/members"><img src="https://img.shields.io/github/forks/Misrilal-Sah/ai-interview-copilot?style=for-the-badge&logo=git&color=00D4FF&labelColor=0f3460" alt="Forks"/></a>
&nbsp;
<a href="https://github.com/Misrilal-Sah/ai-interview-copilot/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-AGPL--3.0-00b894?style=for-the-badge&logo=open-source-initiative&logoColor=white&labelColor=0f3460" alt="License"/></a>
&nbsp;
<img src="https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-a29bfe?style=for-the-badge&logo=electron&logoColor=white&labelColor=0f3460" alt="Platform"/>
&nbsp;
<img src="https://img.shields.io/badge/Built%20With-Electron%20%2B%20React-61dafb?style=for-the-badge&logo=react&logoColor=white&labelColor=0f3460" alt="Stack"/>

<br/><br/>

<!-- Feature pills -->
<img src="https://img.shields.io/badge/🔮%208%20Free%20AI%20Providers-auto--fallback-6c5ce7?style=flat-square&labelColor=1a1a2e"/>
&nbsp;
<img src="https://img.shields.io/badge/📸%20Screenshot%20%2B%20Analyze-instant-00cec9?style=flat-square&labelColor=1a1a2e"/>
&nbsp;
<img src="https://img.shields.io/badge/🎤%20Voice%20Input-Whisper%20API-fd79a8?style=flat-square&labelColor=1a1a2e"/>
&nbsp;
<img src="https://img.shields.io/badge/👻%20Invisible%20Overlay-stealth-fdcb6e?style=flat-square&labelColor=1a1a2e"/>

</div>

---

## 🚀 What Is This?

**AI Interview Copilot** is a free, open-source **invisible desktop overlay** powered by multiple AI providers. It sits on top of any application — silently — and can read your screen, hear your voice, and answer anything in real time.

> Whether you're solving coding problems, answering behavioral questions, reviewing documents, or studying MCQs — this tool has you covered.

<div align="center">

```
┌──────────────────────────────────────────────────────────────┐
│  📸  Take a screenshot  →  🤖  AI analyzes it  →  💡 Answer  │
│  🎤  Speak a question   →  🔊  AI transcribes  →  💡 Answer  │
└──────────────────────────────────────────────────────────────┘
```

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🤖 Multi-Provider AI
- **8 free AI providers** with automatic fallback
- Gemini · OpenAI · Groq · Mistral · GitHub AI · Cohere · OpenRouter · Ollama
- Auto-selects the best available provider
- Falls back silently when rate-limited

</td>
<td width="50%">

### 👻 Invisible Overlay
- Transparent, always-on-top window
- Invisible to most screen-recording software
- Click-through glass effect on empty areas
- Drag to reposition anywhere on screen

</td>
</tr>
<tr>
<td width="50%">

### 📸 Smart Screenshot Analysis
- Capture any portion of your screen
- AI reads code, text, MCQs, diagrams
- Queue up to 2 screenshots at once
- Works with any application or browser

</td>
<td width="50%">

### 🎤 Voice Input
- Click mic → speak → get an AI answer
- Powered by Whisper (Groq / OpenAI)
- Live recording timer + auto-stop at 30s
- No SpeechRecognition API limitations

</td>
</tr>
<tr>
<td width="50%">

### 💻 Two Processing Modes
- **General Mode** — MCQs, essays, behavioral, any content
- **Coding Mode** — 3-stage pipeline: extract → solve → debug
- Toggle anytime with `Ctrl+Shift+G`

</td>
<td width="50%">

### 🎯 Answer History
- All answers saved in-session
- Quick access to past responses
- Copy to clipboard with one click
- Provider + model metadata shown

</td>
</tr>
</table>

---

## 🔑 Supported AI Providers (All Free Tier Available)

| Provider | Models | Voice Transcription | Get Key |
|----------|--------|-------------------|---------|
| **Groq** ⭐ Recommended | Llama 3.3, Mixtral | ✅ Whisper (ultra-fast) | [console.groq.com](https://console.groq.com) |
| **Google Gemini** | Gemini 2.0 Flash | ❌ | [aistudio.google.com](https://aistudio.google.com) |
| **OpenAI** | GPT-4o, GPT-4o-mini | ✅ Whisper-1 | [platform.openai.com](https://platform.openai.com) |
| **Mistral** | Mistral Small/Large | ❌ | [console.mistral.ai](https://console.mistral.ai) |
| **OpenRouter** | 50+ models | ✅ Whisper | [openrouter.ai](https://openrouter.ai) |
| **GitHub AI** | GPT-4o, Llama | ❌ | [github.com/marketplace](https://github.com/marketplace/models) |
| **Cohere** | Command R+ | ❌ | [dashboard.cohere.com](https://dashboard.cohere.com) |
| **Ollama** | Any local model | ❌ | Local (no key needed) |

> 💡 **You only need ONE key to get started.** The app auto-falls back to the next available provider if one hits rate limits.

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+
- npm or bun

### Install & Run

```bash
# Clone the repo
git clone https://github.com/Misrilal-Sah/ai-interview-copilot.git
cd ai-interview-copilot

# Install dependencies
npm install

# Start the app (2 terminals)
# Terminal 1:
npx tsc -w -p tsconfig.electron.json

# Terminal 2:
npx vite
```

> The app launches automatically via `vite-plugin-electron`. **Don't** run `electron` manually.

### First Launch
1. The **Onboarding screen** opens automatically
2. Enter at least one free API key (Groq recommended)
3. Choose your default mode (General / Coding)
4. Click **"Start Using AI Interview Copilot"**

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+H` | 📸 Take a screenshot |
| `Ctrl+Enter` | 🤖 Analyze screenshots |
| `Ctrl+Shift+V` | 🎤 Toggle voice input |
| `Ctrl+Shift+G` | 🔄 Toggle General / Coding mode |
| `Ctrl+B` | 👁️ Show / Hide overlay |
| `Ctrl+R` | 🔄 Clear and start over |
| `Ctrl+L` | 🗑️ Delete last screenshot |
| `Ctrl+[` / `Ctrl+]` | 🔅 Decrease / Increase opacity |
| `Ctrl+Q` | ❌ Quit app |

---

## 🏗️ Architecture

```
ai-interview-copilot/
├── electron/
│   ├── main.ts              # Electron main process, window management
│   ├── ipcHandlers.ts       # IPC bridge (screenshot, voice, AI routing)
│   ├── ProcessingHelper.ts  # AI provider orchestration, multi-provider
│   ├── ScreenshotHelper.ts  # Cross-platform screen capture
│   ├── storage.ts           # Encrypted key storage (electron-store)
│   └── preload.ts           # Secure renderer ↔ main bridge
├── src/
│   ├── App.tsx              # Root: onboarding, click-through, opacity
│   ├── providers/           # Multi-provider AI adapters
│   ├── components/
│   │   ├── Onboarding/      # First-run setup wizard
│   │   ├── VoiceInput/      # MediaRecorder + Whisper transcription
│   │   ├── History/         # In-session answer history
│   │   └── Settings/        # API key management
│   └── _pages/
│       ├── Queue.tsx        # Screenshot queue view
│       └── Solutions.tsx    # AI answer display
└── vite.config.ts           # Vite + vite-plugin-electron
```

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Electron 36 |
| Frontend | React 18 + TypeScript |
| Build | Vite + vite-plugin-electron |
| Styling | Tailwind CSS + Radix UI |
| AI Routing | Custom multi-provider orchestrator |
| Voice | MediaRecorder + Whisper API |
| Storage | electron-store (encrypted) |

</div>

---

## 🔒 Privacy & Security

- ✅ **API keys stored locally** — encrypted on disk, never sent anywhere except the AI provider you chose
- ✅ **Screenshots stay local** — temporarily saved to `AppData/Roaming`, deleted after processing
- ✅ **No telemetry, no analytics, no accounts**
- ✅ **Open source** — read every line of code yourself

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repo
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

- ✅ Free to use, modify, and distribute
- ✅ Modifications must stay open source under the same license
- ✅ Network use (SaaS) requires source disclosure


---

## ⚠️ Ethical Usage

This tool is designed as a **learning aid** and **productivity assistant**:

- Use it to *understand* problems, not just copy answers
- Disclose AI assistance if asked during formal evaluations
- The goal is to accelerate your *learning*, not replace it

---

<div align="center">

<!-- Footer wave -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0f3460,50:16213e,100:1a1a2e&height=120&section=footer&animation=fadeIn" width="100%" />

<br/>

**Made with ❤️ by [Misrilal Sah](https://github.com/Misrilal-Sah)**

<a href="https://github.com/Misrilal-Sah/ai-interview-copilot/issues">🐛 Report Bug</a>
&nbsp;·&nbsp;
<a href="https://github.com/Misrilal-Sah/ai-interview-copilot/issues">✨ Request Feature</a>
&nbsp;·&nbsp;
<a href="https://github.com/Misrilal-Sah">👨‍💻 My GitHub</a>

<br/><br/>

<sub>⭐ Star this repo if it helped you! It motivates further development.</sub>

</div>
