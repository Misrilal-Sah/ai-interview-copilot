<div align="center">

<!-- Animated banner -->
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:1a1a2e,50:16213e,100:0f3460&height=200&section=header&text=AI%20Screen%20Assistant&fontSize=52&fontColor=ffffff&fontAlignY=38&desc=Your%20invisible%20AI%20overlay%20for%20any%20screen&descAlignY=58&descSize=18&descColor=a0aec0&animation=fadeIn" width="100%" />

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
<img src="https://img.shields.io/badge/🔮%208%20AI%20Providers-SVG%20Logos%20%2B%20Fallback-6c5ce7?style=flat-square&labelColor=1a1a2e"/>
&nbsp;
<img src="https://img.shields.io/badge/📸%20Screenshot%20%2B%20Analyze-instant-00cec9?style=flat-square&labelColor=1a1a2e"/>
&nbsp;
<img src="https://img.shields.io/badge/🎤%20Voice%20Input-Whisper%20API-fd79a8?style=flat-square&labelColor=1a1a2e"/>
&nbsp;
<img src="https://img.shields.io/badge/👻%20Invisible%20Overlay-stealth-fdcb6e?style=flat-square&labelColor=1a1a2e"/>
&nbsp;
<img src="https://img.shields.io/badge/⚙️%20Custom%20Shortcuts-fully%20remappable-55efc4?style=flat-square&labelColor=1a1a2e"/>

</div>

---

## 🚀 What Is This?

**AI Screen Assistant** is a free, open-source **invisible desktop overlay** powered by 8 AI providers. It sits on top of any application — silently — and can read your screen, hear your voice, and answer anything in real time.

> Whether you're solving coding problems, answering behavioral questions, reviewing documents, or studying MCQs — this tool has you covered.

<div align="center">

```
┌──────────────────────────────────────────────────────────────┐
│  📸  Take a screenshot  →  🤖  AI analyzes it  →  💡 Answer  │
│  🎤  Speak a question   →  🔊  AI transcribes  →  💡 Answer  │
│  💬  Type a message     →  🧠  AI chat reply   →  💡 Answer  │
└──────────────────────────────────────────────────────────────┘
```

</div>

---

## ✨ Features

<table>
<tr>
<td width="50%">

### 🤖 Multi-Provider AI with SVG Logos
- **8 AI providers** with automatic fallback
- Gemini · Groq · Mistral · GitHub · Cohere · OpenRouter · Cerebras · Cloudflare
- Each provider has a **branded SVG icon** in the UI
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

### 🎛️ Smart Provider & Model Selector
- Custom **dropdown UI** in the top bar (no native selects)
- **Provider-specific model list** — switching provider shows only that provider's models
- **Model capability badges** shown inline:
  - 👁 **Vision** — can accept screenshot/image input
  - ⚡ **Fast** — optimised for low-latency inference
  - 🧠 **Reasoning** — extended chain-of-thought
- Selecting a provider **promotes it to top priority** — your choice actually gets used for the next analysis

</td>
<td width="50%">

### ⌨️ Fully Remappable Shortcuts
- All shortcuts configurable in **Settings → Shortcuts**
- Changes reflect **immediately** everywhere:
  - Bottom action bar (screenshot, solve badges)
  - Settings gear ⚙ tooltip
  - Onboarding hotkey cheat sheet
- Shortcuts parsed and displayed as **keyboard badge pills**

</td>
</tr>
<tr>
<td width="50%">

### 📸 Smart Screenshot Analysis
- Capture any portion of your screen
- AI reads code, text, MCQs, diagrams
- Queue up to 5 screenshots at once
- Works with any application or browser

</td>
<td width="50%">

### 🎤 Voice Input
- Click mic → speak → get an AI answer
- Powered by Groq Whisper (ultra-fast)
- Live recording timer + auto-stop at 30 s
- Answers logged in the **History panel**

</td>
</tr>
<tr>
<td width="50%">

### 💻 Two Processing Modes
- **General Mode** — MCQs, essays, behavioral, any content
- **Coding Mode** — structured solve + debug pipeline
- Toggle anytime with `Ctrl+Shift+G` or click the badge

</td>
<td width="50%">

### 💬 Chat Mode
- Full multi-turn conversation panel
- Invisible to screen capture
- Toggle with `Ctrl+Shift+C`
- Chat history saved in-session

</td>
</tr>
</table>

---

## 🔑 Supported AI Providers

| Provider | SVG Logo Color | Vision | Speed | Free Tier | Models |
|----------|---------------|--------|-------|-----------|--------|
| **Google Gemini** ⭐ | Blue–Violet sparkle | ✅ | Fast | ✅ | Flash 2.0, Pro 1.5, 2.5 |
| **Groq** | Coral lightning bolt | ❌ | Ultra-fast | ✅ | Llama 3.3, Mixtral, Gemma |
| **GitHub Models** | GitHub cat | ✅ (GPT-4o) | Fast | ✅ | GPT-4o, Grok-3, DeepSeek |
| **Mistral** | Orange block grid | ✅ (Pixtral) | Medium | ❌ | Small, Large, Pixtral |
| **OpenRouter** | Indigo routing nodes | ❌ | Var. | ✅ | Custom model string |
| **Cerebras** | Cyan chip wafer | ❌ | Ultra-fast | ✅ | Llama 3.3, Llama 4 Scout |
| **Cohere** | Rose arc | ❌ | Medium | ❌ | Command R, R+ |
| **Cloudflare Workers AI** | Orange cloud | ✅ (Llama Vision) | Fast | ✅ | Llama 3.3, Gemma, DeepSeek |

> 💡 **You only need ONE key to get started.** The app auto-falls back to the next available provider when one hits a rate limit.

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+
- npm

### Install & Run

```bash
# Clone the repo
git clone https://github.com/Misrilal-Sah/ai-interview-copilot.git
cd ai-interview-copilot

# Install dependencies
npm install

# Start (needs 2 terminals)
# Terminal 1 — compile the Electron main process
npx tsc -w -p tsconfig.electron.json

# Terminal 2 — start Vite + Electron (auto-launches the app)
npx vite
```

> The app launches automatically via `vite-plugin-electron`. **Don't** run `electron` manually.

### First Launch
1. The **Onboarding screen** opens automatically
2. Enter at least one free API key — each provider shows its **branded SVG logo**
3. Choose your default mode (General / Coding)
4. Review the **Hotkey Cheat Sheet** (shows your custom shortcuts live)
5. Click **"Start Using AI Screen Assistant"**

---

## ⌨️ Default Keyboard Shortcuts

> All shortcuts are **fully remappable** in Settings → Shortcuts. Every UI element reads from the store and updates instantly.

| Shortcut | Action |
|----------|--------|
| `Ctrl+H` | 📸 Take a screenshot |
| `Ctrl+Enter` | 🤖 Analyze screenshots / Solve |
| `Ctrl+Shift+V` | 🎤 Toggle voice input |
| `Ctrl+Shift+C` | 💬 Toggle chat mode |
| `Ctrl+Shift+G` | 🔄 Toggle General / Coding mode |
| `Ctrl+B` | 👁️ Show / Hide overlay |
| `Ctrl+R` | 🔄 Clear and start over |
| `Ctrl+L` | 🗑️ Delete last screenshot |
| `Ctrl+[` / `Ctrl+]` | 🔅 Decrease / Increase opacity |
| `Ctrl+Q` | ❌ Quit app |

---

## 🏗️ Architecture

```
ai-screen-assistant/
├── electron/
│   ├── main.ts              # Window management, IPC routing
│   ├── ipcHandlers.ts       # Screenshot, voice, chat, AI handlers
│   ├── ProcessingHelper.ts  # Multi-provider orchestration (vision/text fallback)
│   ├── ScreenshotHelper.ts  # Cross-platform screen capture
│   ├── storage.ts           # Encrypted key store (electron-store + TypedAppStore)
│   ├── shortcuts.ts         # Global hotkey registration + customShortcuts store
│   └── preload.ts           # Secure renderer ↔ main bridge
├── src/
│   ├── App.tsx              # Root: onboarding, click-through, opacity, provider mgr
│   ├── providers/
│   │   ├── registry.ts       # Provider registry + vision detection
│   │   ├── types.ts          # FullProviderAdapter, ProviderConfig interfaces
│   │   ├── useProviderManager.ts  # React hook: order, models, reorderProviders
│   │   └── adapters/         # One file per provider (gemini, groq, mistral…)
│   ├── utils/
│   │   ├── providerMeta.ts   # Per-model capability flags (vision/fast/reasoning)
│   │   └── platform.ts       # COMMAND_KEY (⌘ / Ctrl)
│   ├── components/
│   │   ├── shared/
│   │   │   └── ProviderLogo.tsx  # Inline SVG brand logos for all 8 providers
│   │   ├── Queue/
│   │   │   └── QueueCommands.tsx # Bottom bar — dynamic shortcuts from store
│   │   ├── Onboarding/       # 5-step setup wizard (SVG logos + hotkey cheat sheet)
│   │   ├── VoiceInput/       # MediaRecorder + Whisper transcription
│   │   ├── ChatInput/        # Multi-turn chat panel
│   │   ├── History/          # In-session answer history
│   │   └── Settings/         # API keys + shortcut remapping
│   └── _pages/
│       ├── SubscribedApp.tsx  # Overlay shell: custom dropdowns + capability badges
│       ├── Queue.tsx          # Screenshot queue view
│       └── Solutions.tsx      # AI answer display
└── vite.config.ts             # Vite + vite-plugin-electron
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
| Voice | MediaRecorder + Groq Whisper API |
| Storage | electron-store (TypedAppStore wrapper) |
| Icons | Inline SVG brand logos (no dependencies) |

</div>

---

## 🔒 Privacy & Security

- ✅ **API keys stored locally** — encrypted on disk, never sent anywhere except the AI provider you chose
- ✅ **Screenshots stay local** — temporarily saved to `AppData/Roaming`, deleted after processing
- ✅ **No telemetry, no analytics, no accounts**
- ✅ **Open source** — read every line of code yourself
- ✅ **TypedAppStore** — typed wrapper around `electron-store` for safe, schema-validated key access

---

## 🤝 Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repo
2. Create your branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push: `git push origin feature/amazing-feature`
5. Open a Pull Request

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
