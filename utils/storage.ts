import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  codeDiff?: CodeDiff;
  approval?: ApprovalRequest;
  attachments?: MessageAttachment[];
  gitCheckpointHash?: string; // Git commit hash for checkpoint/rewind feature
}

export interface ApprovalRequest {
  id: string;
  description: string;
  tool: string;
  parameters: any;
  status: 'pending' | 'approved' | 'denied';
}

export interface CodeDiff {
  filename: string;
  oldCode: string;
  newCode: string;
  language: string;
}

export interface FileAttachment {
  type: 'file';
  name: string;
  path: string;
  size?: number;
}

export interface ImageAttachment {
  type: 'image';
  uri: string;
  name?: string;
  size?: number;
  width?: number;
  height?: number;
  mimeType?: string;
}

export type MessageAttachment = FileAttachment | ImageAttachment;

export interface CustomModel {
  id: string;
  name: string;
  apiKey: string;
  endpoint: string;
  createdAt: Date;
}

export interface GitSettings {
  remoteUrl: string;
  username: string;
  token: string;
  authorName: string;
  authorEmail: string;
}

const CHATS_KEY = '@cursor_chats';
const CURRENT_CHAT_KEY = '@cursor_current_chat';
const MODEL_KEY = '@cursor_model';
const CUSTOM_MODELS_KEY = '@cursor_custom_models';
const OPENAI_KEY_KEY = '@cursor_openai_key';
const ANTHROPIC_KEY_KEY = '@cursor_anthropic_key';
const HF_KEY_KEY = '@cursor_hf_key';
const GEMINI_KEY_KEY = '@cursor_gemini_key';
const GLM_KEY_KEY = '@cursor_glm_key';
const GIT_SETTINGS_KEY = '@cursor_git_settings';
const REMOTE_SKILLS_KEY = '@mobcode_remote_skills';
const REMOTE_SKILLS_SYNC_KEY = '@mobcode_remote_skills_sync_time';
const OPENROUTER_KEY_KEY = '@cursor_openrouter_key';
const OPENROUTER_MODELS_KEY = '@mobcode_openrouter_models';

export const storage = {
  // Get all chats
  async getChats(): Promise<Chat[]> {
    try {
      const data = await AsyncStorage.getItem(CHATS_KEY);
      if (!data) return [];
      const chats = JSON.parse(data);
      return chats.map((chat: any) => ({
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      }));
    } catch (error) {
      console.error('Error getting chats:', error);
      return [];
    }
  },

  // Save a chat
  async saveChat(chat: Chat): Promise<void> {
    try {
      const chats = await this.getChats();
      const index = chats.findIndex((c) => c.id === chat.id);
      if (index >= 0) {
        chats[index] = chat;
      } else {
        chats.unshift(chat);
      }
      await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(chats));
    } catch (error) {
      console.error('Error saving chat:', error);
    }
  },

  // Delete a chat
  async deleteChat(chatId: string): Promise<void> {
    try {
      const chats = await this.getChats();
      const filtered = chats.filter((c) => c.id !== chatId);
      await AsyncStorage.setItem(CHATS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  },

  // Get current chat
  async getCurrentChat(): Promise<Chat | null> {
    try {
      const data = await AsyncStorage.getItem(CURRENT_CHAT_KEY);
      if (!data) return null;
      const chat = JSON.parse(data);
      return {
        ...chat,
        createdAt: new Date(chat.createdAt),
        updatedAt: new Date(chat.updatedAt),
        messages: chat.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        })),
      };
    } catch (error) {
      console.error('Error getting current chat:', error);
      return null;
    }
  },

  // Set current chat
  async setCurrentChat(chat: Chat | null): Promise<void> {
    try {
      if (chat) {
        await AsyncStorage.setItem(CURRENT_CHAT_KEY, JSON.stringify(chat));
      } else {
        await AsyncStorage.removeItem(CURRENT_CHAT_KEY);
      }
    } catch (error) {
      console.error('Error setting current chat:', error);
    }
  },

  // Get selected model
  async getModel(): Promise<string> {
    try {
      const model = await AsyncStorage.getItem(MODEL_KEY);
      return model || 'claude-3.5-sonnet';
    } catch (error) {
      console.error('Error getting model:', error);
      return 'claude-3.5-sonnet';
    }
  },

  // Set selected model
  async setModel(model: string): Promise<void> {
    try {
      await AsyncStorage.setItem(MODEL_KEY, model);
    } catch (error) {
      console.error('Error setting model:', error);
    }
  },

  // Get all custom models
  async getCustomModels(): Promise<CustomModel[]> {
    try {
      const data = await AsyncStorage.getItem(CUSTOM_MODELS_KEY);
      if (!data) return [];
      const models = JSON.parse(data);
      return models.map((model: any) => ({
        ...model,
        createdAt: new Date(model.createdAt),
      }));
    } catch (error) {
      console.error('Error getting custom models:', error);
      return [];
    }
  },

  // Save a custom model
  async saveCustomModel(model: CustomModel): Promise<void> {
    try {
      const models = await this.getCustomModels();
      const index = models.findIndex((m) => m.id === model.id);
      if (index >= 0) {
        models[index] = model;
      } else {
        models.unshift(model);
      }
      await AsyncStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(models));
    } catch (error) {
      console.error('Error saving custom model:', error);
    }
  },

  // Delete a custom model
  async deleteCustomModel(modelId: string): Promise<void> {
    try {
      const models = await this.getCustomModels();
      const filtered = models.filter((m) => m.id !== modelId);
      await AsyncStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting custom model:', error);
    }
  },

  // Get OpenAI API key
  async getOpenAIKey(): Promise<string> {
    try {
      const key = await AsyncStorage.getItem(OPENAI_KEY_KEY);
      return key || '';
    } catch (error) {
      console.error('Error getting OpenAI key:', error);
      return '';
    }
  },

  // Set OpenAI API key
  async setOpenAIKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(OPENAI_KEY_KEY, key);
    } catch (error) {
      console.error('Error setting OpenAI key:', error);
    }
  },

  // Get Anthropic API key
  async getAnthropicKey(): Promise<string> {
    try {
      const key = await AsyncStorage.getItem(ANTHROPIC_KEY_KEY);
      return key || '';
    } catch (error) {
      console.error('Error getting Anthropic key:', error);
      return '';
    }
  },

  // Set Anthropic API key
  async setAnthropicKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(ANTHROPIC_KEY_KEY, key);
    } catch (error) {
      console.error('Error setting Anthropic key:', error);
    }
  },

  // Get Hugging Face API key
  async getHuggingFaceKey(): Promise<string> {
    try {
      const key = await AsyncStorage.getItem(HF_KEY_KEY);
      return key || '';
    } catch (error) {
      console.error('Error getting Hugging Face key:', error);
      return '';
    }
  },

  // Set Hugging Face API key
  async setHuggingFaceKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(HF_KEY_KEY, key);
    } catch (error) {
      console.error('Error setting Hugging Face key:', error);
    }
  },

  // Get Gemini API key
  async getGeminiKey(): Promise<string> {
    try {
      const key = await AsyncStorage.getItem(GEMINI_KEY_KEY);
      return key || '';
    } catch (error) {
      console.error('Error getting Gemini key:', error);
      return '';
    }
  },

  // Set Gemini API key
  async setGeminiKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(GEMINI_KEY_KEY, key);
    } catch (error) {
      console.error('Error setting Gemini key:', error);
    }
  },

  // Get GLM API key
  async getGlmKey(): Promise<string> {
    try {
      const key = await AsyncStorage.getItem(GLM_KEY_KEY);
      return key || '';
    } catch (error) {
      console.error('Error getting GLM key:', error);
      return '';
    }
  },

  // Set GLM API key
  async setGlmKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(GLM_KEY_KEY, key);
    } catch (error) {
      console.error('Error setting GLM key:', error);
    }
  },

  // Get git settings
  async getGitSettings(): Promise<GitSettings> {
    try {
      const data = await AsyncStorage.getItem(GIT_SETTINGS_KEY);
      if (!data) {
        return {
          remoteUrl: '',
          username: '',
          token: '',
          authorName: 'Mobcode User',
          authorEmail: 'user@example.com',
        };
      }
      const parsed = JSON.parse(data);
      return {
        remoteUrl: parsed.remoteUrl || '',
        username: parsed.username || '',
        token: parsed.token || '',
        authorName: parsed.authorName || 'Mobcode User',
        authorEmail: parsed.authorEmail || 'user@example.com',
      };
    } catch (error) {
      console.error('Error getting git settings:', error);
      return {
        remoteUrl: '',
        username: '',
        token: '',
        authorName: 'Mobcode User',
        authorEmail: 'user@example.com',
      };
    }
  },

  // Save git settings
  async setGitSettings(settings: GitSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(GIT_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving git settings:', error);
    }
  },

  // Get cached remote skills
  async getRemoteSkills(): Promise<Record<string, string>> {
    try {
      const data = await AsyncStorage.getItem(REMOTE_SKILLS_KEY);
      if (!data) return {};
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting remote skills:', error);
      return {};
    }
  },

  // Save cached remote skills
  async setRemoteSkills(skills: Record<string, string>): Promise<void> {
    try {
      await AsyncStorage.setItem(REMOTE_SKILLS_KEY, JSON.stringify(skills));
    } catch (error) {
      console.error('Error saving remote skills:', error);
    }
  },

  // Get last sync timestamp
  async getRemoteSkillsSyncTime(): Promise<number> {
    try {
      const data = await AsyncStorage.getItem(REMOTE_SKILLS_SYNC_KEY);
      if (!data) return 0;
      return parseInt(data, 10);
    } catch (error) {
      console.error('Error getting remote skills sync time:', error);
      return 0;
    }
  },

  // Save sync timestamp
  async setRemoteSkillsSyncTime(timestamp: number): Promise<void> {
    try {
      await AsyncStorage.setItem(REMOTE_SKILLS_SYNC_KEY, timestamp.toString());
    } catch (error) {
      console.error('Error saving remote skills sync time:', error);
    }
  },

  // Get OpenRouter API key
  async getOpenRouterKey(): Promise<string> {
    try {
      const key = await AsyncStorage.getItem(OPENROUTER_KEY_KEY);
      return key || '';
    } catch (error) {
      console.error('Error getting OpenRouter key:', error);
      return '';
    }
  },

  // Set OpenRouter API key
  async setOpenRouterKey(key: string): Promise<void> {
    try {
      await AsyncStorage.setItem(OPENROUTER_KEY_KEY, key);
    } catch (error) {
      console.error('Error setting OpenRouter key:', error);
    }
  },

  // Get cached OpenRouter models
  async getOpenRouterModels(): Promise<any[]> {
    try {
      const data = await AsyncStorage.getItem(OPENROUTER_MODELS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting cached OpenRouter models:', error);
      return [];
    }
  },

  // Save cached OpenRouter models
  async setOpenRouterModels(models: any[]): Promise<void> {
    try {
      await AsyncStorage.setItem(OPENROUTER_MODELS_KEY, JSON.stringify(models));
    } catch (error) {
      console.error('Error saving OpenRouter models:', error);
    }
  },
};
