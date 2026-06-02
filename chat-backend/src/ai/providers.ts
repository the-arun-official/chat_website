// src/ai/providers.ts
// Multi-provider AI abstraction with fallback strategy
// Primary: Ollama (local, free) → Fallback: HuggingFace (cloud, free tier)

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generateReply(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string>;
}

// ─── Ollama Provider (Local, Primary) ──────────────────────────────────────
class OllamaProvider implements AIProvider {
  name = 'Ollama';
  private url: string;
  private model: string;

  constructor(url: string, model: string) {
    this.url = url;
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.url}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateReply(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string> {
    const response = await fetch(`${this.url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        stream: false,
        temperature: 0.8,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    const data = (await response.json()) as { message?: { content?: string } };
    return (data.message?.content || '').trim();
  }
}

// ─── Groq Provider (Primary, Ultra-Fast, Free) ───────────────────────────────
class GroqProvider implements AIProvider {
  name = 'Groq';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateReply(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: formattedMessages,
        temperature: 0.8,
        max_tokens: 300,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const error = (await response.json()) as Record<string, unknown>;
      throw new Error(`Groq error: ${JSON.stringify(error)}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return (data.choices?.[0]?.message?.content || '').trim();
  }
}

// ─── HuggingFace Provider (Alternative Fallback) ───────────────────────────
class HuggingFaceProvider implements AIProvider {
  name = 'HuggingFace';
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = 'mistralai/Mistral-7B-Instruct-v0.1') {
    this.apiKey = apiKey;
    this.model = model;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${this.model}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(5000),
      });
      return response.ok || response.status === 503; // 503 = model loading
    } catch {
      return false;
    }
  }

  async generateReply(systemPrompt: string, messages: { role: string; content: string }[]): Promise<string> {
    const formattedPrompt = `${systemPrompt}\n\n${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}\nassistant:`;

    const response = await fetch(`https://api-inference.huggingface.co/models/${this.model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: formattedPrompt,
        parameters: { max_new_tokens: 300, temperature: 0.8 },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`HuggingFace error: ${response.statusText}`);

    const data = (await response.json()) as Array<{ generated_text?: string }>;
    const generated = data[0]?.generated_text || '';
    return generated.slice(formattedPrompt.length).trim();
  }
}

// ─── Provider Manager with Fallback Logic ──────────────────────────────────
export class AIProviderManager {
  private providers: AIProvider[] = [];
  private healthCache: Map<string, { healthy: boolean; timestamp: number }> = new Map();
  private healthCheckInterval = 5 * 60 * 1000; // 5 minutes

  constructor(providers: AIProvider[]) {
    this.providers = providers;
  }

  async generateReply(
    systemPrompt: string,
    messages: { role: string; content: string }[]
  ): Promise<{ reply: string; provider: string }> {
    const errors: Array<{ provider: string; error: string }> = [];

    for (const provider of this.providers) {
      try {
        // Check cache first
        const cached = this.healthCache.get(provider.name);
        if (cached && Date.now() - cached.timestamp < this.healthCheckInterval) {
          if (!cached.healthy) {
            console.log(`[AIProvider] Skipping ${provider.name} (cached as unhealthy)`);
            continue;
          }
        } else {
          // Check availability
          const available = await provider.isAvailable();
          this.healthCache.set(provider.name, { healthy: available, timestamp: Date.now() });

          if (!available) {
            console.log(`[AIProvider] ${provider.name} is unavailable`);
            continue;
          }
        }

        console.log(`[AIProvider] Attempting with ${provider.name}`);
        const reply = await provider.generateReply(systemPrompt, messages);

        if (reply) {
          console.log(`[AIProvider] Success with ${provider.name}`);
          return { reply, provider: provider.name };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`[AIProvider] ${provider.name} failed:`, errorMsg);
        errors.push({ provider: provider.name, error: errorMsg });
        this.healthCache.set(provider.name, { healthy: false, timestamp: Date.now() });
      }
    }

    // All providers failed
    console.error('[AIProvider] All providers failed:', errors);
    throw new Error(
      `All AI providers failed. Errors: ${errors.map((e) => `${e.provider}: ${e.error}`).join('; ')}`
    );
  }

  getProviderStatus(): Array<{ name: string; healthy: boolean }> {
    return this.providers.map((p) => {
      const cached = this.healthCache.get(p.name);
      return { name: p.name, healthy: cached?.healthy ?? false };
    });
  }

  clearHealthCache(): void {
    this.healthCache.clear();
  }
}

// ─── Factory ───────────────────────────────────────────────────────────────────────
export function createProviderManager(): AIProviderManager {
  const providers: AIProvider[] = [];

  // Groq is the primary provider (blazing fast, high limits, free)
  if (process.env.GROQ_API_KEY) {
    providers.push(new GroqProvider(process.env.GROQ_API_KEY));
  }

  // HuggingFace is the fallback (cloud, fast, free tier)
  if (process.env.HUGGINGFACE_API_KEY) {
    providers.push(new HuggingFaceProvider(process.env.HUGGINGFACE_API_KEY));
  }

  // Ollama is optional (local, can be slow on low-spec machines)
  // Only enable if OLLAMA_ENABLED=true is explicitly set in .env
  if (process.env.OLLAMA_ENABLED === 'true') {
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'mistral';
    providers.push(new OllamaProvider(ollamaUrl, ollamaModel));
  }

  if (providers.length === 0) {
    throw new Error('No AI providers configured. Set HUGGINGFACE_API_KEY or OLLAMA_ENABLED=true');
  }

  return new AIProviderManager(providers);
}
