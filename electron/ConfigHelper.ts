// ConfigHelper.ts — Minimal legacy config helper.
// Only used for: language preference, opacity, and hasApiKey (legacy fallback check).
// All AI provider management is done via storage.ts + src/providers/registry.ts.
import fs from "node:fs"
import path from "node:path"
import { app } from "electron"
import { EventEmitter } from "events"

interface Config {
  apiKey: string;
  apiProvider: "openai" | "gemini" | "anthropic";
  language: string;
  opacity: number;
}

export class ConfigHelper extends EventEmitter {
  private configPath: string;
  private defaultConfig: Config = {
    apiKey: "",
    apiProvider: "gemini",
    language: "python",
    opacity: 1.0
  };

  constructor() {
    super();
    try {
      this.configPath = path.join(app.getPath('userData'), 'config.json');
      console.log('Config path:', this.configPath);
    } catch {
      this.configPath = path.join(process.cwd(), 'config.json');
    }
    this.ensureConfigExists();
  }

  private ensureConfigExists(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        this.saveConfig(this.defaultConfig);
      }
    } catch (err) {
      console.error("Error ensuring config exists:", err);
    }
  }

  public loadConfig(): Config {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const config = JSON.parse(configData);
        return { ...this.defaultConfig, ...config };
      }
      this.saveConfig(this.defaultConfig);
      return this.defaultConfig;
    } catch {
      return this.defaultConfig;
    }
  }

  public saveConfig(config: Config): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (err) {
      console.error("Error saving config:", err);
    }
  }

  public updateConfig(updates: Partial<Config>): Config {
    try {
      const currentConfig = this.loadConfig();
      const newConfig = { ...currentConfig, ...updates };
      this.saveConfig(newConfig);
      if (updates.language !== undefined) {
        this.emit('config-updated', newConfig);
      }
      return newConfig;
    } catch {
      return this.defaultConfig;
    }
  }

  /** True if a legacy API key is stored in config.json (OpenAI/Gemini/Anthropic). */
  public hasApiKey(): boolean {
    const config = this.loadConfig();
    return !!config.apiKey && config.apiKey.trim().length > 0;
  }

  public getOpacity(): number {
    const config = this.loadConfig();
    return config.opacity !== undefined ? config.opacity : 1.0;
  }

  public setOpacity(opacity: number): void {
    const validOpacity = Math.min(1.0, Math.max(0.1, opacity));
    this.updateConfig({ opacity: validOpacity });
  }

  public getLanguage(): string {
    const config = this.loadConfig();
    return config.language || "python";
  }

  public setLanguage(language: string): void {
    this.updateConfig({ language });
  }
}

export const configHelper = new ConfigHelper();
