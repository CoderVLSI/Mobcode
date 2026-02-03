import { CustomModel } from './storage';
import { LOCAL_MODEL_ID, streamLocalChat } from './localLlama';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  error?: string;
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface AnthropicResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

interface CustomAPIResponse {
  response?: string;
  message?: string;
  text?: string;
  content?: string;
  choices?: Array<{ message: { content: string } }>;
}

interface HFResponse {
  readonly generated_text?: string;
  readonly text?: string;
  readonly response?: string;
  readonly content?: string;
}

class AIService {
  async streamChat(
    messages: AIMessage[],
    model: string,
    customModels: CustomModel[],
    apiKey: string | undefined,
    onToken: (token: string) => void,
    hfApiKey?: string,
    geminiApiKey?: string
  ): Promise<AIResponse> {
    // Check if it's a custom model
    const customModel = customModels.find((m) => m.id === model);

    if (customModel) {
      // For now, treat custom models as non-streaming unless we implement generic SSE
      // Fallback to normal chat but call onToken at the end
      const response = await this.callCustomAPI(messages, customModel);
      onToken(response.content);
      return response;
    }

    if (model.startsWith('gpt')) {
      return this.streamOpenAI(messages, model, apiKey, onToken);
    } else if (model.startsWith('claude') || model.startsWith('anthropic')) {
      return this.streamAnthropic(messages, model, apiKey, onToken);
    } else if (model.startsWith('gemini')) {
      return this.streamGemini(messages, model, geminiApiKey, onToken);
    } else if (model === LOCAL_MODEL_ID) {
      return this.streamLocal(messages, onToken);
    } else if (model.startsWith('hf-') || model.startsWith('liquidai/') || model.includes('/')) {
      // Hugging Face model (hf- prefix or contains / like "LiquidAI/LFM2.5-1.2B-Thinking")
      return await this.streamHuggingFace(messages, model, hfApiKey, onToken);
    }

    return {
      content: 'Model not supported for streaming.',
      error: 'Unsupported model',
    };
  }

  private streamOpenAI(
    messages: AIMessage[],
    model: string,
    apiKey: string | undefined,
    onToken: (token: string) => void
  ): Promise<AIResponse> {
    return new Promise((resolve) => {
      if (!apiKey) {
        resolve({
          content: 'Please add your OpenAI API key.',
          error: 'No API key provided',
        });
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.openai.com/v1/chat/completions');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);

      let lastIndex = 0;
      let fullContent = '';

      xhr.onprogress = () => {
        const currIndex = xhr.responseText.length;
        if (lastIndex === currIndex) return;
        
        const chunk = xhr.responseText.substring(lastIndex, currIndex);
        lastIndex = currIndex;

        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const token = data.choices?.[0]?.delta?.content || '';
              if (token) {
                fullContent += token;
                onToken(token);
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ content: fullContent });
        } else {
          resolve({ content: xhr.responseText, error: 'API Error' });
        }
      };

      xhr.onerror = () => {
        resolve({ content: 'Network error', error: 'Network error' });
      };

      xhr.send(JSON.stringify({
        model: model === 'gpt-4o-mini' ? 'gpt-4o-mini' : 'gpt-4o',
        messages: messages,
        max_tokens: 2000,
        stream: true,
      }));
    });
  }

  private streamAnthropic(
    messages: AIMessage[],
    model: string,
    apiKey: string | undefined,
    onToken: (token: string) => void
  ): Promise<AIResponse> {
    return new Promise((resolve) => {
      if (!apiKey) {
        resolve({
          content: 'Please add your Anthropic API key.',
          error: 'No API key provided',
        });
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.anthropic.com/v1/messages');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('x-api-key', apiKey);
      xhr.setRequestHeader('anthropic-version', '2023-06-01');

      let lastIndex = 0;
      let fullContent = '';

      xhr.onprogress = () => {
        const currIndex = xhr.responseText.length;
        if (lastIndex === currIndex) return;

        const chunk = xhr.responseText.substring(lastIndex, currIndex);
        lastIndex = currIndex;

        const lines = chunk.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                const token = data.delta.text;
                if (token) {
                  fullContent += token;
                  onToken(token);
                }
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ content: fullContent });
        } else {
          resolve({ content: xhr.responseText, error: 'API Error' });
        }
      };

      xhr.onerror = () => {
        resolve({ content: 'Network error', error: 'Network error' });
      };

      xhr.send(JSON.stringify({
        model: model === 'claude-3-haiku' ? 'claude-3-5-haiku-20241022' : 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: messages.filter((m) => m.role !== 'system'),
        system: messages.find((m) => m.role === 'system')?.content || '',
        stream: true,
      }));
    });
  }

  private streamGemini(
    messages: AIMessage[],
    model: string,
    apiKey: string | undefined,
    onToken: (token: string) => void
  ): Promise<AIResponse> {
    return new Promise((resolve) => {
      if (!apiKey) {
        resolve({
          content: 'Please add your Gemini API key.',
          error: 'No API key provided',
        });
        return;
      }

      // Map model names to Gemini API model IDs
      const modelMap: Record<string, string> = {
        'gemini-2.5-flash': 'gemini-2.0-flash-exp',
        'gemini-2.5-flash-lite': 'gemini-2.0-flash-thinking-exp',
        'gemini-2.5-pro': 'gemini-2.5-pro-exp-09-24',
        'gemini-1.5-flash': 'gemini-1.5-flash',
        'gemini-1.5-pro': 'gemini-1.5-pro',
      };

      const geminiModel = modelMap[model] || model;

      // Build contents array for Gemini API
      const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        }));

      // Add system instruction if present
      const systemInstruction = messages.find(m => m.role === 'system')?.content;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:streamGenerateContent?key=${apiKey}`);
      xhr.setRequestHeader('Content-Type', 'application/json');

      let fullContent = '';

      xhr.onprogress = () => {
        const lines = xhr.responseText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) {
                fullContent += text;
                onToken(text);
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ content: fullContent });
        } else {
          resolve({ content: xhr.responseText, error: 'API Error' });
        }
      };

      xhr.onerror = () => {
        resolve({ content: 'Network error', error: 'Network error' });
      };

      const requestBody: any = {
        contents: contents,
        generationConfig: {
          maxOutputTokens: 2000,
          temperature: 0.7,
        }
      };

      if (systemInstruction) {
        requestBody.systemInstruction = {
          parts: [{ text: systemInstruction }]
        };
      }

      xhr.send(JSON.stringify(requestBody));
    });
  }

  private streamLocal(
    messages: AIMessage[],
    onToken: (token: string) => void
  ): Promise<AIResponse> {
    return streamLocalChat(messages, onToken);
  }

  async chat(
    messages: AIMessage[],
    model: string,
    customModels: CustomModel[],
    apiKey?: string
  ): Promise<AIResponse> {
    // Check if it's a custom model
    const customModel = customModels.find((m) => m.id === model);

    if (customModel) {
      return this.callCustomAPI(messages, customModel);
    }

    if (model === LOCAL_MODEL_ID) {
      return streamLocalChat(messages);
    }

    // Default models
    if (model.startsWith('claude') || model.startsWith('anthropic')) {
      return this.callAnthropic(messages, model, apiKey);
    } else if (model.startsWith('gpt')) {
      return this.callOpenAI(messages, model, apiKey);
    }

    return {
      content: 'Model not supported. Please add it as a custom model in settings.',
      error: 'Unsupported model',
    };
  }

  private async callOpenAI(messages: AIMessage[], model: string, apiKey?: string): Promise<AIResponse> {
    if (!apiKey) {
      return {
        content: 'Please add your OpenAI API key in settings to use GPT models.',
        error: 'No API key provided',
      };
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model === 'gpt-4o-mini' ? 'gpt-4o-mini' : 'gpt-4o',
          messages: messages,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          content: `API Error (${response.status}): ${error}`,
          error: error,
        };
      }

      const data: OpenAIResponse = await response.json();
      return {
        content: data.choices[0]?.message?.content || 'No response from API',
      };
    } catch (error) {
      return {
        content: 'Network error: ' + (error as Error).message,
        error: (error as Error).message,
      };
    }
  }

  private async callAnthropic(messages: AIMessage[], model: string, apiKey?: string): Promise<AIResponse> {
    if (!apiKey) {
      return {
        content: 'Please add your Anthropic API key in settings to use Claude models.',
        error: 'No API key provided',
      };
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model === 'claude-3-haiku' ? 'claude-3-5-haiku-20241022' : 'claude-3-5-sonnet-20241022',
          max_tokens: 2000,
          messages: messages.filter((m) => m.role !== 'system'),
          system: messages.find((m) => m.role === 'system')?.content || '',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          content: `API Error (${response.status}): ${error}`,
          error: error,
        };
      }

      const data: AnthropicResponse = await response.json();
      const textContent = data.content
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n');

      return {
        content: textContent || 'No response from API',
      };
    } catch (error) {
      return {
        content: 'Network error: ' + (error as Error).message,
        error: (error as Error).message,
      };
    }
  }

  private async callCustomAPI(messages: AIMessage[], model: CustomModel): Promise<AIResponse> {
    try {
      // Build the endpoint URL properly
      let endpoint = model.endpoint;

      // Remove trailing slash if present
      endpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;

      // If endpoint doesn't end with /chat/completions, append it
      // But be careful not to duplicate version paths like /v4/v1
      if (!endpoint.endsWith('/chat/completions')) {
        // Check if endpoint already ends with a version number (like /v1, /v2, /v4, etc.)
        const hasVersionPattern = /\/v\d+\/?$/.test(endpoint);

        if (hasVersionPattern) {
          // Endpoint has version like /v4 - use /chat/completions directly (no /v1)
          endpoint = `${endpoint}/chat/completions`;
        } else {
          // No version pattern, add full path
          endpoint = `${endpoint}/v1/chat/completions`;
        }
      }

      console.log('Calling custom API at:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${model.apiKey}`,
        },
        body: JSON.stringify({
          model: model.name,
          messages: messages,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('API Error:', error);
        return {
          content: 'API Error: ' + error,
          error: error,
        };
      }

      const data: CustomAPIResponse = await response.json();
      console.log('API Response data:', data);

      // Try different response formats
      const content =
        data?.choices?.[0]?.message?.content ||
        data?.response ||
        data?.message ||
        data?.text ||
        data?.content ||
        'Unknown response format';

      return {
        content: content as string,
      };
    } catch (error) {
      console.error('Network error:', error);
      return {
        content: 'Network error: ' + (error as Error).message,
        error: (error as Error).message,
      };
    }
  }
}

export const aiService = new AIService();
