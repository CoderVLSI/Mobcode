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
    geminiApiKey?: string,
    openRouterApiKey?: string
  ): Promise<AIResponse> {
    // Log incoming request
    console.log('=== AI SERVICE STREAM REQUEST ===');
    console.log('Model:', model);
    console.log('Messages count:', messages.length);
    console.log('Last user message:', messages[messages.length - 1]?.content?.substring(0, 200) || 'No message');

    // Check if it's a custom model
    const customModel = customModels.find((m) => m.id === model);

    if (customModel) {
      console.log('Using custom model:', customModel.name);
      // For now, treat custom models as non-streaming unless we implement generic SSE
      // Fallback to normal chat but call onToken at the end
      const response = await this.callCustomAPI(messages, customModel);
      console.log('Custom model response length:', response.content?.length || 0);
      onToken(response.content);
      return response;
    }

    let result: AIResponse;

    if (model.startsWith('gpt')) {
      console.log('Routing to OpenAI stream');
      result = await this.streamOpenAI(messages, model, apiKey, onToken);
    } else if (model.startsWith('claude') || model.startsWith('anthropic')) {
      console.log('Routing to Anthropic stream');
      result = await this.streamAnthropic(messages, model, apiKey, onToken);
    } else if (model.startsWith('gemini')) {
      console.log('Routing to Gemini stream');
      result = await this.streamGemini(messages, model, geminiApiKey, onToken);
    } else if (model.startsWith('glm')) {
      console.log('Routing to GLM stream');
      result = await this.streamGLM(messages, model, apiKey, onToken);
    } else if (model.startsWith('openrouter/')) {
      console.log('Routing to OpenRouter stream');
      const key = openRouterApiKey || apiKey;
      result = await this.streamOpenRouter(messages, model, key, onToken);
    } else if (model === LOCAL_MODEL_ID) {
      console.log('Routing to Local model');
      result = await this.streamLocal(messages, onToken);
    } else if (model.startsWith('hf-') || model.startsWith('liquidai/') || model.includes('/')) {
      console.log('Routing to HuggingFace stream');
      // Hugging Face model (hf- prefix or contains / like "LiquidAI/LFM2.5-1.2B-Thinking")
      result = await this.streamHuggingFace(messages, model, hfApiKey, onToken);
    } else {
      console.log('ERROR: Unsupported model', model);
      result = {
        content: 'Model not supported for streaming.',
        error: 'Unsupported model',
      };
    }

    console.log('=== STREAM RESPONSE COMPLETE ===');
    console.log('Response length:', result.content?.length || 0);
    console.log('Has error:', !!result.error);
    if (result.error) {
      console.log('Error:', result.error);
    }

    return result;
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
        max_tokens: model === 'gpt-4o-mini' ? 16384 : 4096,  // GPT-4o-mini: 16384, GPT-4o: 4096
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
        max_tokens: 8192,  // Claude 3.5 max output tokens
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

      // Use stable Gemini model IDs directly.
      const modelMap: Record<string, string> = {
        'gemini-2.5-flash': 'gemini-2.5-flash',
        'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
        'gemini-2.5-pro': 'gemini-2.5-pro',
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
      let lastIndex = 0;
      let pending = '';

      const extractText = (data: any) => {
        const parts = data?.candidates?.[0]?.content?.parts;
        if (!Array.isArray(parts)) return '';
        return parts.map((part: any) => part?.text || '').join('');
      };

      const extractError = (data: any) => {
        const message =
          data?.error?.message ||
          data?.promptFeedback?.blockReasonMessage ||
          data?.promptFeedback?.blockReason ||
          data?.error;
        if (!message) return '';
        return typeof message === 'string' ? message : JSON.stringify(message);
      };

      const handleJson = (jsonText: string) => {
        try {
          const data = JSON.parse(jsonText);
          const text = extractText(data);
          if (text) {
            fullContent += text;
            onToken(text);
            return;
          }
          const errorText = extractError(data);
          if (errorText) {
            fullContent += errorText;
            onToken(errorText);
          }
        } catch (e) {
          // Ignore parse errors for partial chunks
        }
      };

      const handleLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('data:')) {
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') return;
          handleJson(payload);
          return;
        }
        if (trimmed.startsWith('{')) {
          handleJson(trimmed);
        }
      };

      const extractFromResponse = (responseText: string) => {
        const lines = responseText.split('\n');
        let combined = '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          if (trimmed.startsWith('data:')) {
            const payload = trimmed.slice(5).trim();
            if (payload === '[DONE]') continue;
            try {
              const data = JSON.parse(payload);
              combined += extractText(data) || extractError(data);
            } catch (e) {
              // Ignore parse errors
            }
          } else if (trimmed.startsWith('{')) {
            try {
              const data = JSON.parse(trimmed);
              combined += extractText(data) || extractError(data);
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
        if (combined) return combined;
        try {
          const data = JSON.parse(responseText);
          return extractText(data) || extractError(data);
        } catch (e) {
          return '';
        }
      };

      const fallbackRequest = async (): Promise<AIResponse> => {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(requestBody),
            }
          );

          const rawText = await response.text();
          if (!response.ok) {
            const errorText = rawText || `API Error (${response.status})`;
            return { content: errorText, error: errorText };
          }

          let data: any = null;
          try {
            data = JSON.parse(rawText);
          } catch (e) {
            return { content: rawText || 'No response from API', error: 'Invalid JSON response' };
          }

          const text = extractText(data) || extractError(data) || '';
          return { content: text || 'No response from API' };
        } catch (error) {
          const message = (error as Error).message || String(error);
          return { content: 'Network error: ' + message, error: message };
        }
      };

      let resolved = false;

      const finish = (response: AIResponse) => {
        if (resolved) return;
        resolved = true;
        resolve(response);
      };

      xhr.onprogress = () => {
        const currIndex = xhr.responseText.length;
        if (lastIndex === currIndex) return;

        const chunk = pending + xhr.responseText.substring(lastIndex, currIndex);
        lastIndex = currIndex;

        const lines = chunk.split('\n');
        pending = lines.pop() || '';
        for (const line of lines) {
          handleLine(line);
        }
      };

      xhr.onload = () => {
        if (pending.trim().length > 0) {
          handleLine(pending);
          pending = '';
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          if (!fullContent) {
            const fallback = extractFromResponse(xhr.responseText);
            if (fallback) {
              fullContent = fallback;
              onToken(fallback);
              return finish({ content: fullContent });
            }
            fallbackRequest().then((response) => {
              if (response.content) onToken(response.content);
              finish(response);
            });
            return;
          }
          finish({ content: fullContent });
          return;
        }

        fallbackRequest().then((response) => {
          if (response.content) onToken(response.content);
          finish(response);
        });
      };

      xhr.onerror = () => {
        fallbackRequest().then((response) => {
          if (response.content) onToken(response.content);
          finish(response);
        });
      };

      const requestBody: any = {
        contents: contents,
        generationConfig: {
          maxOutputTokens: 8192,  // Increased from 2000 to match Gemini's limit
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

  private streamGLM(
    messages: AIMessage[],
    model: string,
    apiKey: string | undefined,
    onToken: (token: string) => void
  ): Promise<AIResponse> {
    return new Promise((resolve) => {
      console.log('=== GLM STREAM START ===');
      console.log('GLM Model:', model);

      if (!apiKey) {
        console.log('ERROR: No GLM API key provided');
        resolve({
          content: 'Please add your Zhipu AI API key in Settings.',
          error: 'No API key provided',
        });
        return;
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.z.ai/api/coding/paas/v4/chat/completions');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);

      let lastIndex = 0;
      let fullContent = '';
      let tokenCount = 0;

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
                tokenCount++;
                onToken(token);
              }
            } catch (e) {
              // Ignore parse errors for partial chunks
            }
          }
        }
      };

      xhr.onload = () => {
        console.log('=== GLM STREAM COMPLETE ===');
        console.log('Status:', xhr.status);
        console.log('Tokens received:', tokenCount);
        console.log('Content length:', fullContent.length);
        console.log('First 200 chars:', fullContent.substring(0, 200));

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ content: fullContent });
        } else {
          console.log('GLM API Error Response:', xhr.responseText);
          resolve({ content: `GLM API Error: ${xhr.status}`, error: 'API Error' });
        }
      };

      xhr.onerror = () => {
        console.log('GLM Network Error');
        resolve({ content: 'Network error connecting to GLM API', error: 'Network error' });
      };

      // Map model names to GLM model IDs
      const modelMap: Record<string, string> = {
        'glm-4.7': 'GLM-4.7',
        'glm-4.7-coder': 'GLM-4.7',
        'glm-4-coder': 'glm-4-coder',
        'GLM-4.7': 'GLM-4.7',
      };

      const glmModel = modelMap[model] || model;
      console.log('GLM API Model:', glmModel);
      console.log('Request messages:', messages.length);

      const requestBody = {
        model: glmModel,
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096, // Reduced for better GLM reliability
      };

      console.log('GLM Request body:', JSON.stringify(requestBody, null, 2));

      xhr.send(JSON.stringify(requestBody));
    });
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
    } else if (model.startsWith('glm')) {
      return this.callGLM(messages, model, apiKey);
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
          max_tokens: model === 'gpt-4o-mini' ? 16384 : 4096,  // GPT-4o-mini: 16384, GPT-4o: 4096
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

  private async callGLM(messages: AIMessage[], model: string, apiKey?: string): Promise<AIResponse> {
    if (!apiKey) {
      return {
        content: 'Please add your Zhipu AI API key in settings to use GLM models.',
        error: 'No API key provided',
      };
    }

    try {
      const modelMap: Record<string, string> = {
        'glm-4.7': 'GLM-4.7',
        'glm-4.7-coder': 'GLM-4.7',
        'glm-4-coder': 'glm-4-coder',
        'GLM-4.7': 'GLM-4.7',
      };

      const glmModel = modelMap[model] || model;

      const response = await fetch('https://api.z.ai/api/coding/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: glmModel,
          messages: messages,
          max_tokens: 4096, // Reduced for better GLM reliability
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return {
          content: `GLM API Error (${response.status}): ${error}`,
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
          max_tokens: 8192,  // Claude 3.5 max output tokens
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
          max_tokens: 16000,
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

  private async streamHuggingFace(
    messages: AIMessage[],
    model: string,
    apiKey: string | undefined,
    onToken: (token: string) => void
  ): Promise<AIResponse> {
    return {
      content: "Hugging Face streaming is currently not implemented.",
      error: "Not implemented"
    };
  }

  async fetchOpenRouterModels(apiKey: string): Promise<any[]> {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch models');
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error('OpenRouter fetch error:', error);
      return [];
    }
  }

  private streamOpenRouter(
    messages: AIMessage[],
    model: string,
    apiKey: string | undefined,
    onToken: (token: string) => void
  ): Promise<AIResponse> {
    return new Promise((resolve) => {
      if (!apiKey) {
        resolve({
          content: 'Please add your OpenRouter API key.',
          error: 'No API key provided',
        });
        return;
      }

      const modelId = model.replace('openrouter/', '');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://openrouter.ai/api/v1/chat/completions');
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${apiKey}`);
      xhr.setRequestHeader('HTTP-Referer', 'https://mobcode.app');
      xhr.setRequestHeader('X-Title', 'Mobcode');

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
        model: modelId,
        messages: messages,
        stream: true,
      }));
    });
  }
}

export const aiService = new AIService();
