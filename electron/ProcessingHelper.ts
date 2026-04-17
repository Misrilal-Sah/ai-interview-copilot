// ProcessingHelper.ts
import fs from "node:fs"
import path from "node:path"
import { BrowserWindow } from "electron"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { IProcessingHelperDeps } from "./main"
import { configHelper } from "./ConfigHelper"

export class ProcessingHelper {
  private deps: IProcessingHelperDeps
  private screenshotHelper: ScreenshotHelper

  // AbortControllers for API requests
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(deps: IProcessingHelperDeps) {
    this.deps = deps
    this.screenshotHelper = deps.getScreenshotHelper()
  }
  


  private async waitForInitialization(
    mainWindow: BrowserWindow
  ): Promise<void> {
    let attempts = 0
    const maxAttempts = 50 // 5 seconds total

    while (attempts < maxAttempts) {
      const isInitialized = await mainWindow.webContents.executeJavaScript(
        "window.__IS_INITIALIZED__"
      )
      if (isInitialized) return
      await new Promise((resolve) => setTimeout(resolve, 100))
      attempts++
    }
    throw new Error("App failed to initialize after 5 seconds")
  }

  private async getCredits(): Promise<number> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return 999 // Unlimited credits in this version

    try {
      await this.waitForInitialization(mainWindow)
      return 999 // Always return sufficient credits to work
    } catch (error) {
      console.error("Error getting credits:", error)
      return 999 // Unlimited credits as fallback
    }
  }

  private async getLanguage(): Promise<string> {
    try {
      // Get language from config
      const config = configHelper.loadConfig();
      if (config.language) {
        return config.language;
      }
      
      // Fallback to window variable if config doesn't have language
      const mainWindow = this.deps.getMainWindow()
      if (mainWindow) {
        try {
          await this.waitForInitialization(mainWindow)
          const language = await mainWindow.webContents.executeJavaScript(
            "window.__LANGUAGE__"
          )

          if (
            typeof language === "string" &&
            language !== undefined &&
            language !== null
          ) {
            return language;
          }
        } catch (err) {
          console.warn("Could not get language from window", err);
        }
      }
      
      // Default fallback
      return "python";
    } catch (error) {
      console.error("Error getting language:", error)
      return "python"
    }
  }

  public async processScreenshots(): Promise<void> {
    const mainWindow = this.deps.getMainWindow()
    if (!mainWindow) return

    const config = configHelper.loadConfig();
    
    // ── New provider system fallback ──────────────────────────────────────────
    // If there is no legacy key (openai/gemini/anthropic in config.json) but
    // there ARE keys saved via the new Settings panel (Mistral, Groq, etc.),
    // route through the new multi-provider pipeline instead of failing.
    const hasLegacyKey = !!config.apiKey && config.apiKey.trim().length > 0;
    if (!hasLegacyKey) {
      try {
        const { getAllSavedProviderIds } = await import("./storage");
        const savedIds = getAllSavedProviderIds();
        if (savedIds.length > 0) {
          console.log("No legacy API key; routing through new provider system for screenshot analysis.");
          await this.processScreenshotsViaNewProviders(mainWindow);
          return;
        }
      } catch (e) {
        console.error("Error checking new provider keys:", e);
      }
      // No keys at all
      console.error("No API key configured in any provider");
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.API_KEY_INVALID);
      return;
    }

    const view = this.deps.getView()
    console.log("Processing screenshots in view:", view)

    if (view === "queue") {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START)
      const screenshotQueue = this.screenshotHelper.getScreenshotQueue()
      console.log("Processing main queue screenshots:", screenshotQueue)
      
      // Check if the queue is empty
      if (!screenshotQueue || screenshotQueue.length === 0) {
        console.log("No screenshots found in queue");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }

      // Check that files actually exist
      const existingScreenshots = screenshotQueue.filter(path => fs.existsSync(path));
      if (existingScreenshots.length === 0) {
        console.log("Screenshot files don't exist on disk");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }

      try {
        // Initialize AbortController
        this.currentProcessingAbortController = new AbortController()

        const screenshots = await Promise.all(
          existingScreenshots.map(async (path) => {
            try {
              return {
                path,
                preview: await this.screenshotHelper.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              };
            } catch (err) {
              console.error(`Error reading screenshot ${path}:`, err);
              return null;
            }
          })
        )

        // Filter out any nulls from failed screenshots
        const validScreenshots = screenshots.filter(Boolean);
        
        if (validScreenshots.length === 0) {
          throw new Error("Failed to load screenshot data");
        }

        // Route through new multi-provider pipeline (legacy helper removed)
        const imageBase64 = validScreenshots[0]!.data as string
        const language = await this.getLanguage()
        const systemPrompt = "You are an expert coding interview assistant. Analyze the screenshot of a coding problem and provide a complete solution."
        const userPrompt = `Analyze this coding problem screenshot and provide a complete solution in ${language}.\n\nProvide your response in this format:\n1. Code: A clean, optimized implementation in ${language}\n2. Your Thoughts: Key insights and reasoning\n3. Time complexity: O(X) with explanation\n4. Space complexity: O(X) with explanation\n\nBe thorough and handle edge cases.`
        const providerResult = await this.callProviderWithPrompt(imageBase64, systemPrompt, userPrompt)

        if (!providerResult.success || !providerResult.text) {
          const errMsg = providerResult.error ?? "No response from AI provider"
          console.log("Processing failed:", errMsg)
          if (errMsg.includes("API Key") || errMsg.includes("OpenAI") || errMsg.includes("Gemini")) {
            mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.API_KEY_INVALID)
          } else {
            mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, errMsg)
          }
          console.log("Resetting view to queue due to error")
          this.deps.setView("queue")
          return
        }

        // Format and emit solution
        const responseContent = providerResult.text
        const codeMatch = responseContent.match(/```(?:\w+)?\s*([\s\S]*?)```/)
        const code = codeMatch ? codeMatch[1].trim() : responseContent
        const timeMatch = responseContent.match(/Time complexity:?\s*([^\n]+)/i)
        const spaceMatch = responseContent.match(/Space complexity:?\s*([^\n]+)/i)
        const formattedResponse = {
          code,
          thoughts: [`Solution generated by ${providerResult.providerId ?? "AI"}`],
          time_complexity: timeMatch?.[1]?.trim() ?? "See solution",
          space_complexity: spaceMatch?.[1]?.trim() ?? "See solution"
        }
        console.log("Setting view to solutions after successful processing")
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS, formattedResponse)
        this.deps.setView("solutions")
      } catch (error: any) {
        mainWindow.webContents.send(
          this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
          error
        )
        console.error("Processing error:", error)
        // Check for abort (user cancelled)
        if (error?.name === "AbortError" || error?.message?.includes("cancel")) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            "Processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR,
            error.message || "Server error. Please try again."
          )
        }
        // Reset view back to queue on error
        console.log("Resetting view to queue due to error")
        this.deps.setView("queue")
      } finally {
        this.currentProcessingAbortController = null
      }
    } else {
      // view == 'solutions'
      const extraScreenshotQueue =
        this.screenshotHelper.getExtraScreenshotQueue()
      console.log("Processing extra queue screenshots:", extraScreenshotQueue)
      
      // Check if the extra queue is empty
      if (!extraScreenshotQueue || extraScreenshotQueue.length === 0) {
        console.log("No extra screenshots found in queue");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        
        return;
      }

      // Check that files actually exist
      const existingExtraScreenshots = extraScreenshotQueue.filter(path => fs.existsSync(path));
      if (existingExtraScreenshots.length === 0) {
        console.log("Extra screenshot files don't exist on disk");
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
        return;
      }
      
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START)

      // Initialize AbortController
      this.currentExtraProcessingAbortController = new AbortController()

      try {
        // Get all screenshots (both main and extra) for processing
        const allPaths = [
          ...this.screenshotHelper.getScreenshotQueue(),
          ...existingExtraScreenshots
        ];
        
        const screenshots = await Promise.all(
          allPaths.map(async (path) => {
            try {
              if (!fs.existsSync(path)) {
                console.warn(`Screenshot file does not exist: ${path}`);
                return null;
              }
              
              return {
                path,
                preview: await this.screenshotHelper.getImagePreview(path),
                data: fs.readFileSync(path).toString('base64')
              };
            } catch (err) {
              console.error(`Error reading screenshot ${path}:`, err);
              return null;
            }
          })
        )
        
        // Filter out any nulls from failed screenshots
        const validScreenshots = screenshots.filter(Boolean);
        
        if (validScreenshots.length === 0) {
          throw new Error("Failed to load screenshot data for debugging");
        }
        
        console.log(
          "Combined screenshots for processing:",
          validScreenshots.map((s) => s.path)
        )

        // Route through new multi-provider pipeline (legacy helper removed)
        const imageBase64 = validScreenshots[0]!.data as string
        const problemInfo = this.deps.getProblemInfo()
        const problemCtx = problemInfo?.problem_statement ? `\nProblem context: ${problemInfo.problem_statement}` : ""
        const language = await this.getLanguage()
        const systemPrompt = "You are an expert coding interview assistant helping debug and improve solutions."
        const userPrompt = `Analyze this screenshot of my code / error output and help me debug it.${problemCtx}\nPreferred language: ${language}.\n\nProvide:\n### Issues Identified\n- bullet list\n\n### Specific Improvements and Corrections\n- bullet list\n\n### Optimizations\n- any perf improvements\n\n### Explanation of Changes Needed\nclear explanation\n\n### Key Points\n- summary`
        const debugResult = await this.callProviderWithPrompt(imageBase64, systemPrompt, userPrompt)

        if (debugResult.success && debugResult.text) {
          const codeMatch = debugResult.text.match(/```(?:[a-zA-Z]+)?([\s\S]*?)```/)
          const extractedCode = codeMatch?.[1]?.trim() ?? "// See debug analysis below"
          const bulletPoints = debugResult.text.match(/(?:^|\n)[ ]*(?:[-*•]|\d+\.)[ ]+([^\n]+)/g)
          const thoughts = bulletPoints
            ? bulletPoints.map(p => p.replace(/^[ ]*(?:[-*•]|\d+\.)[ ]+/, "").trim()).slice(0, 5)
            : ["Debug analysis based on your screenshots"]
          const debugData = {
            code: extractedCode,
            debug_analysis: debugResult.text,
            thoughts,
            time_complexity: "N/A - Debug mode",
            space_complexity: "N/A - Debug mode"
          }
          this.deps.setHasDebugged(true)
          mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS, debugData)
        } else {
          mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, debugResult.error ?? "Debug analysis failed")
        }
      } catch (error: any) {
        // Check for abort (user cancelled)
        if (error?.name === "AbortError" || error?.message?.includes("cancel")) {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            "Extra processing was canceled by the user."
          )
        } else {
          mainWindow.webContents.send(
            this.deps.PROCESSING_EVENTS.DEBUG_ERROR,
            error.message
          )
        }
      } finally {
        this.currentExtraProcessingAbortController = null
      }
    }
  }

  /**
   * Process screenshots using the new multi-provider system
   */
  private async processScreenshotsViaNewProviders(mainWindow: import("electron").BrowserWindow): Promise<void> {
    const view = this.deps.getView();
    console.log("Processing screenshots via new provider system, view:", view);

    const screenshotHelper = this.deps.getScreenshotHelper();
    if (!screenshotHelper) return;

    const isDebugMode = view === "solutions";
    const queue = isDebugMode
      ? [...screenshotHelper.getScreenshotQueue(), ...screenshotHelper.getExtraScreenshotQueue()]
      : screenshotHelper.getScreenshotQueue();

    if (!queue || queue.length === 0) {
      console.log("No screenshots in queue");
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
      return;
    }

    // Verify files exist
    const existingPaths = queue.filter(p => { try { return require("fs").existsSync(p); } catch { return false; } });
    if (existingPaths.length === 0) {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS);
      return;
    }

    if (isDebugMode) {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_START);
    } else {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_START);
    }

    try {
      // Read the first screenshot as base64 for vision
      const fs = require("fs");
      const firstImageBase64: string = fs.readFileSync(existingPaths[0]).toString("base64");

      // Build a combined prompt
      const language = await this.getLanguage();

      let systemPrompt: string;
      let userPrompt: string;

      if (isDebugMode) {
        const problemInfo = this.deps.getProblemInfo();
        const problemCtx = problemInfo?.problem_statement
          ? `\nProblem context: ${problemInfo.problem_statement}`
          : "";
        systemPrompt = "You are an expert coding interview assistant helping debug and improve solutions.";
        userPrompt = `Analyze this screenshot of my code / error output and help me debug it.${problemCtx}\nPreferred language: ${language}.\n\nProvide:\n### Issues Identified\n- bullet list\n\n### Specific Improvements and Corrections\n- bullet list\n\n### Optimizations\n- any perf improvements\n\n### Explanation of Changes Needed\nclear explanation\n\n### Key Points\n- summary`;
      } else {
        systemPrompt = "You are an expert coding interview assistant. Analyze the screenshot of a coding problem and provide a complete solution.";
        userPrompt = `Analyze this coding problem screenshot and provide a complete solution in ${language}.\n\nProvide your response in this format:\n1. Code: A clean, optimized implementation in ${language}\n2. Your Thoughts: Key insights and reasoning\n3. Time complexity: O(X) with explanation\n4. Space complexity: O(X) with explanation\n\nBe thorough and handle edge cases.`;
      }

      // Send progress update
      mainWindow.webContents.send("processing-status", {
        message: "Analyzing screenshot with AI...",
        progress: 30
      });

      const result = await this.callProviderWithPrompt(firstImageBase64, systemPrompt, userPrompt);

      if (!result.success || !result.text) {
        const errMsg = result.error ?? "No response from AI provider";
        console.error("New provider processing failed:", errMsg);
        if (isDebugMode) {
          mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, errMsg);
        } else {
          mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, errMsg);
          this.deps.setView("queue");
        }
        return;
      }

      mainWindow.webContents.send("processing-status", { message: "Processing complete", progress: 100 });

      const responseContent = result.text;

      if (isDebugMode) {
        // Format debug response
        const codeMatch = responseContent.match(/```(?:[a-zA-Z]+)?([\s\S]*?)```/);
        const extractedCode = codeMatch?.[1]?.trim() ?? "// See debug analysis below";
        const bulletPoints = responseContent.match(/(?:^|\n)[ ]*(?:[-*•]|\d+\.)[ ]+([^\n]+)/g);
        const thoughts = bulletPoints
          ? bulletPoints.map(p => p.replace(/^[ ]*(?:[-*•]|\d+\.)[ ]+/, "").trim()).slice(0, 5)
          : ["Debug analysis based on your screenshots"];

        const debugData = {
          code: extractedCode,
          debug_analysis: responseContent,
          thoughts,
          time_complexity: "N/A - Debug mode",
          space_complexity: "N/A - Debug mode"
        };
        this.deps.setHasDebugged(true);
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_SUCCESS, debugData);
      } else {
        // Format solution response
        const codeMatch = responseContent.match(/```(?:\w+)?\s*([\s\S]*?)```/);
        const code = codeMatch ? codeMatch[1].trim() : responseContent;

        const thoughtsRegex = /(?:Thoughts:|Key Insights:|Reasoning:|Approach:)([\s\S]*?)(?:Time complexity:|$)/i;
        const thoughtsMatch = responseContent.match(thoughtsRegex);
        let thoughts: string[] = [];
        if (thoughtsMatch?.[1]) {
          const bullets = thoughtsMatch[1].match(/(?:^|\n)\s*(?:[-*•]|\d+\.)\s*(.*)/g);
          thoughts = bullets
            ? bullets.map(p => p.replace(/^\s*(?:[-*•]|\d+\.)\s*/, "").trim()).filter(Boolean)
            : thoughtsMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
        }

        const timeMatch = responseContent.match(/Time complexity:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:Space complexity|$))/i);
        const spaceMatch = responseContent.match(/Space complexity:?\s*([^\n]+(?:\n[^\n]+)*?)(?=\n\s*(?:[A-Z]|$))/i);

        const formattedResponse = {
          code,
          thoughts: thoughts.length > 0 ? thoughts : [`Solution generated by ${result.providerId ?? "AI"}`],
          time_complexity: timeMatch?.[1]?.trim() ?? "O(n) - See solution for details",
          space_complexity: spaceMatch?.[1]?.trim() ?? "O(n) - See solution for details"
        };

        // Extract problem info from screenshot text and store it
        const problemInfo = {
          problem_statement: "Extracted from screenshot (see solution below)",
          constraints: "",
          example_input: "",
          example_output: ""
        };
        this.deps.setProblemInfo(problemInfo);

        screenshotHelper.clearExtraScreenshotQueue();

        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.SOLUTION_SUCCESS, formattedResponse);
        this.deps.setView("solutions");
      }
    } catch (error: any) {
      const msg = error?.message ?? "Failed to process screenshot";
      console.error("processScreenshotsViaNewProviders error:", error);
      if (isDebugMode) {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.DEBUG_ERROR, msg);
      } else {
        mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.INITIAL_SOLUTION_ERROR, msg);
        this.deps.setView("queue");
      }
    }
  }

  /**
   * Generalized call to the new multi-provider system with custom prompts.
   * Tries vision providers first; falls back to text-only if no vision provider exists.
   */
  private async callProviderWithPrompt(
    imageBase64: string | null,
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ success: boolean; text?: string; providerId?: string; model?: string; error?: string }> {
    try {
      const requireVision = !!imageBase64;
      const skipIds: string[] = [];

      for (let attempt = 0; attempt < 8; attempt++) {
        const provider = await this.getActiveProviderAndKey(requireVision, skipIds);
        if (!provider) {
          // If no vision provider, try text-only
          if (requireVision) {
            const textProvider = await this.getActiveProviderAndKey(false, skipIds);
            if (!textProvider) {
              return { success: false, error: "No AI provider configured. Please add an API key in Settings." };
            }
            const response = await textProvider.adapter.call(
              textProvider.apiKey, userPrompt, null, textProvider.model, systemPrompt, textProvider.accountId
            );
            if (response.error?.includes("Rate limit")) {
              skipIds.push(textProvider.adapter.config.id);
              continue;
            }
            return { success: !response.error, text: response.text, providerId: response.providerId, model: response.model, error: response.error };
          }
          return { success: false, error: "No AI provider configured. Please add an API key in Settings." };
        }

        const response = await provider.adapter.call(
          provider.apiKey, userPrompt, imageBase64, provider.model, systemPrompt, provider.accountId
        );
        if (response.error?.includes("Rate limit")) {
          skipIds.push(provider.adapter.config.id);
          continue;
        }
        return { success: !response.error, text: response.text, providerId: response.providerId, model: response.model, error: response.error };
      }

      return { success: false, error: "All providers hit rate limits. Please wait and try again." };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  }

  public cancelOngoingRequests(): void {
    let wasCancelled = false

    if (this.currentProcessingAbortController) {
      this.currentProcessingAbortController.abort()
      this.currentProcessingAbortController = null
      wasCancelled = true
    }

    if (this.currentExtraProcessingAbortController) {
      this.currentExtraProcessingAbortController.abort()
      this.currentExtraProcessingAbortController = null
      wasCancelled = true
    }

    this.deps.setHasDebugged(false)
    this.deps.setProblemInfo(null)

    const mainWindow = this.deps.getMainWindow()
    if (wasCancelled && mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(this.deps.PROCESSING_EVENTS.NO_SCREENSHOTS)
    }
  }

  // ── New Multi-Provider System (Step 5) ────────────────────────────────────

  /**
   * Find the highest-priority provider that has a saved API key.
   * When requireVision is true, only considers providers that support vision
   * for their currently selected model.
   */
  public async getActiveProviderAndKey(
    requireVision: boolean,
    skipProviderIds: string[] = []
  ): Promise<{
    adapter: import("../src/providers/types").FullProviderAdapter
    apiKey: string
    model: string
    accountId?: string
  } | null> {
    try {
      const { getProvidersSortedByOrder, adapterSupportsVision } = await import("../src/providers/registry")
      const { getApiKey, appStore } = await import("./storage")

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const store = appStore as any
      const providerOrder: string[] = (store.get("providerOrder") as string[]) ?? []
      const modelPreferences: Record<string, string> = (store.get("modelPreferences") as Record<string, string>) ?? {}

      const sortedAdapters = getProvidersSortedByOrder(providerOrder)

      for (const adapter of sortedAdapters) {
        const id = adapter.config.id
        if (skipProviderIds.includes(id)) continue

        const apiKey = getApiKey(id)
        if (!apiKey) continue

        const model = modelPreferences[id] || adapter.config.defaultModel

        if (requireVision && !adapterSupportsVision(adapter, model)) continue

        const accountId = id === "cloudflare"
          ? ((store.get("cloudflareAccountId") as string) ?? "")
          : undefined

        return { adapter, apiKey, model, accountId }
      }
    } catch (err) {
      console.error("getActiveProviderAndKey error:", err)
    }
    return null
  }

  /**
   * General mode: single-stage pipeline — send screenshot to best vision provider,
   * get a general answer for any on-screen content.
   */
  public async processGeneralAnswer(imageBase64: string): Promise<{
    success: boolean
    text?: string
    providerId?: string
    model?: string
    error?: string
  }> {
    try {
      const { buildGeneralPrompt } = await import("../src/utils/promptBuilder")
      const { appStore } = await import("./storage")

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customPrompt = ((appStore as any).get("customPrompt") as string) ?? ""
      const answerLanguage = ((appStore as any).get("answerLanguage") as string) ?? "auto"
      const prompt = buildGeneralPrompt(customPrompt, answerLanguage)

      // Try vision providers in priority order, fall back to text on rate limit
      const skipIds: string[] = []
      for (let attempt = 0; attempt < 8; attempt++) {
        const provider = await this.getActiveProviderAndKey(true, skipIds)
        if (!provider) {
          // No vision providers — fall back to text only
          const textProvider = await this.getActiveProviderAndKey(false, skipIds)
          if (!textProvider) {
            return { success: false, error: "No AI provider configured. Please add an API key in Settings." }
          }
          const response = await textProvider.adapter.call(
            textProvider.apiKey, prompt, null, textProvider.model, "", textProvider.accountId
          )
          if (response.error && response.error.includes("Rate limit")) {
            skipIds.push(textProvider.adapter.config.id)
            continue
          }
          return { success: !response.error, text: response.text, providerId: response.providerId, model: response.model, error: response.error }
        }

        const response = await provider.adapter.call(
          provider.apiKey, prompt, imageBase64, provider.model, "", provider.accountId
        )
        if (response.error && response.error.includes("Rate limit")) {
          skipIds.push(provider.adapter.config.id)
          continue
        }
        return { success: !response.error, text: response.text, providerId: response.providerId, model: response.model, error: response.error }
      }
      return { success: false, error: "All providers hit rate limits. Please wait a moment and try again." }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg }
    }
  }

  /**
   * Voice mode: text-only pipeline — send transcript to best text provider,
   * get a conversational answer.
   */
  public async processVoiceQuestion(transcript: string): Promise<{
    success: boolean
    text?: string
    providerId?: string
    model?: string
    error?: string
  }> {
    try {
      const { buildVoicePrompt } = await import("../src/utils/promptBuilder")
      const { appStore } = await import("./storage")

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customPrompt = ((appStore as any).get("customPrompt") as string) ?? ""
      const answerLanguage = ((appStore as any).get("answerLanguage") as string) ?? "auto"
      const prompt = buildVoicePrompt(transcript, customPrompt, answerLanguage)

      const skipIds: string[] = []
      for (let attempt = 0; attempt < 8; attempt++) {
        const provider = await this.getActiveProviderAndKey(false, skipIds)
        if (!provider) {
          return { success: false, error: "No AI provider configured. Please add an API key in Settings." }
        }
        const response = await provider.adapter.call(
          provider.apiKey, prompt, null, provider.model, "", provider.accountId
        )
        if (response.error && response.error.includes("Rate limit")) {
          skipIds.push(provider.adapter.config.id)
          continue
        }
        return { success: !response.error, text: response.text, providerId: response.providerId, model: response.model, error: response.error }
      }
      return { success: false, error: "All providers hit rate limits. Please wait and try again." }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg }
    }
  }

  /**
   * Chat mode: text-only pipeline with multi-turn conversation history.
   * Sends the user's message along with recent chat history to the best text provider.
   */
  public async processChatQuestion(
    message: string,
    history: Array<{ role: "user" | "assistant"; content: string }>,
    imageBase64?: string | null
  ): Promise<{
    success: boolean
    text?: string
    providerId?: string
    model?: string
    error?: string
  }> {
    try {
      const { buildChatPrompt } = await import("../src/utils/promptBuilder")
      const { appStore } = await import("./storage")

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customPrompt = ((appStore as any).get("customPrompt") as string) ?? ""
      const answerLanguage = ((appStore as any).get("answerLanguage") as string) ?? "auto"
      const prompt = buildChatPrompt(message, history, customPrompt, answerLanguage)

      const hasImage = !!imageBase64
      const skipIds: string[] = []
      for (let attempt = 0; attempt < 8; attempt++) {
        // If there's an image, try vision provider first
        const provider = await this.getActiveProviderAndKey(hasImage, skipIds)
        if (!provider) {
          // If no vision provider found but we have an image, fall back to text-only
          if (hasImage) {
            const textProvider = await this.getActiveProviderAndKey(false, skipIds)
            if (!textProvider) {
              return { success: false, error: "No AI provider configured. Please add an API key in Settings." }
            }
            const response = await textProvider.adapter.call(
              textProvider.apiKey, prompt, null, textProvider.model, "", textProvider.accountId
            )
            if (response.error && response.error.includes("Rate limit")) {
              skipIds.push(textProvider.adapter.config.id)
              continue
            }
            return { success: !response.error, text: response.text, providerId: response.providerId, model: response.model, error: response.error }
          }
          return { success: false, error: "No AI provider configured. Please add an API key in Settings." }
        }
        const response = await provider.adapter.call(
          provider.apiKey, prompt, hasImage ? imageBase64 : null, provider.model, "", provider.accountId
        )
        if (response.error && response.error.includes("Rate limit")) {
          skipIds.push(provider.adapter.config.id)
          continue
        }
        return { success: !response.error, text: response.text, providerId: response.providerId, model: response.model, error: response.error }
      }
      return { success: false, error: "All providers hit rate limits. Please wait and try again." }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg }
    }
  }
}

