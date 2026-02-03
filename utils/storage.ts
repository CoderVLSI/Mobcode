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
}

export interface CodeDiff {
  filename: string;
  oldCode: string;
  newCode: string;
  language: string;
}

export interface CustomModel {
  id: string;
  name: string;
  apiKey: string;
  endpoint: string;
  createdAt: Date;
}

const CHATS_KEY = '@cursor_chats';
const CURRENT_CHAT_KEY = '@cursor_current_chat';
const MODEL_KEY = '@cursor_model';
const CUSTOM_MODELS_KEY = '@cursor_custom_models';
const OPENAI_KEY_KEY = '@cursor_openai_key';
const ANTHROPIC_KEY_KEY = '@cursor_anthropic_key';

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
};
