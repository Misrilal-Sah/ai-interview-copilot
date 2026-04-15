// src/components/shared/ProviderLogo.tsx — Inline SVG brand logos for all 8 AI providers
import React from "react"

interface LogoProps {
  size?: number
  className?: string
}

// ── Gemini (Google AI) — 4-point sparkle star, blue ──────────────────────────
export const GeminiLogo = ({ size = 16, className = "" }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 2L13.8 10.2L22 12L13.8 13.8L12 22L10.2 13.8L2 12L10.2 10.2Z"
      fill="#4285F4"
    />
    <path
      d="M12 5L13.2 10.8L19 12L13.2 13.2L12 19L10.8 13.2L5 12L10.8 10.8Z"
      fill="#A855F7"
      opacity="0.5"
    />
  </svg>
)

// ── Groq — Lightning bolt, coral-red ─────────────────────────────────────────
export const GroqLogo = ({ size = 16, className = "" }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" fill="#F55036" />
  </svg>
)

// ── GitHub Models — GitHub Octocat (white on dark) ────────────────────────────
export const GithubLogo = ({ size = 16, className = "" }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z"
      fill="#e6edf3"
    />
  </svg>
)

// ── OpenRouter — Connected routing nodes, indigo/purple ───────────────────────
export const OpenRouterLogo = ({ size = 16, className = "" }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="5" cy="12" r="3" fill="#6366f1" />
    <circle cx="19" cy="6"  r="3" fill="#a855f7" />
    <circle cx="19" cy="18" r="3" fill="#a855f7" />
    <line x1="8"  y1="10.8" x2="16" y2="7.5"  stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="8"  y1="13.2" x2="16" y2="16.5" stroke="#8b5cf6" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

// ── Cerebras — CPU chip wafer pattern, cyan ───────────────────────────────────
export const CerebrasLogo = ({ size = 16, className = "" }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="5" y="5" width="14" height="14" rx="2" stroke="#00B4D8" strokeWidth="1.5" fill="none" />
    <rect x="9" y="9" width="6"  height="6"  rx="1" fill="#00B4D8" opacity="0.7" />
    {/* Pins */}
    <line x1="5" y1="9"  x2="2" y2="9"  stroke="#00B4D8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="5" y1="15" x2="2" y2="15" stroke="#00B4D8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="19" y1="9"  x2="22" y2="9"  stroke="#00B4D8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="19" y1="15" x2="22" y2="15" stroke="#00B4D8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="9"  y1="5" x2="9"  y2="2" stroke="#00B4D8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="15" y1="5" x2="15" y2="2" stroke="#00B4D8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="9"  y1="19" x2="9"  y2="22" stroke="#00B4D8" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="15" y1="19" x2="15" y2="22" stroke="#00B4D8" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

// ── Mistral — Stacked block wave (Mistral brand style), amber ─────────────────
export const MistralLogo = ({ size = 16, className = "" }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    {/* Row 1 */}
    <rect x="3"  y="3" width="5" height="5" fill="#FF7000" />
    <rect x="10" y="3" width="5" height="5" fill="#FF7000" />
    <rect x="17" y="3" width="5" height="5" fill="#FF7000" />
    {/* Row 2 */}
    <rect x="10" y="10" width="5" height="5" fill="#FF7000" opacity="0.85" />
    <rect x="17" y="10" width="5" height="5" fill="#FF7000" />
    {/* Row 3 */}
    <rect x="17" y="17" width="5" height="5" fill="#FF7000" opacity="0.7" />
  </svg>
)

// ── Cohere — Bold open arc "C", rose/pink ─────────────────────────────────────
export const CohereLogo = ({ size = 16, className = "" }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M19 12a7 7 0 1 1-4.17-6.38"
      stroke="#f43f5e"
      strokeWidth="3"
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="18" cy="5" r="2.5" fill="#a855f7" />
  </svg>
)

// ── Cloudflare — Cloud silhouette with speed ray, orange ──────────────────────
export const CloudflareLogo = ({ size = 16, className = "" }: LogoProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M18.5 15H7a4.5 4.5 0 1 1 .67-8.95A5.5 5.5 0 0 1 17 9.5h1.5a3 3 0 0 1 0 6z"
      fill="#F6821F"
    />
    <path d="M10 15L8 20H11L9.5 24L16 18H12L14 15Z" fill="#FBAD41" opacity="0.8" />
  </svg>
)

// ── Universal ProviderLogo router ─────────────────────────────────────────────
interface ProviderLogoProps {
  providerId: string
  size?: number
  className?: string
}

export const ProviderLogo: React.FC<ProviderLogoProps> = ({ providerId, size = 16, className = "" }) => {
  switch (providerId) {
    case "gemini":      return <GeminiLogo     size={size} className={className} />
    case "groq":        return <GroqLogo        size={size} className={className} />
    case "github":      return <GithubLogo      size={size} className={className} />
    case "openrouter":  return <OpenRouterLogo  size={size} className={className} />
    case "cerebras":    return <CerebrasLogo    size={size} className={className} />
    case "mistral":     return <MistralLogo     size={size} className={className} />
    case "cohere":      return <CohereLogo      size={size} className={className} />
    case "cloudflare":  return <CloudflareLogo  size={size} className={className} />
    default:
      return (
        <div
          style={{ width: size, height: size, borderRadius: "50%", background: "#555", display: "inline-block" }}
        />
      )
  }
}
