import * as FileSystem from 'expo-file-system';
import type { AIMessage, AIResponse } from './aiService';

// Conditional import for llama.rn (only available in dev builds, not Expo Go)
let initLlama: any;
let LlamaContext: any;
try {
  const llamaModule = require('llama.rn');
  initLlama = llamaModule.initLlama;
  LlamaContext = llamaModule.LlamaContext;
} catch (e) {
  console.log('llama.rn not available - local model support disabled');
}

export const LOCAL_MODEL_AVAILABLE = !!initLlama;

export const LOCAL_MODEL_ID = 'local-qwen2.5-coder-1.5b';
export const LOCAL_MODEL_NAME = 'Qwen2.5 Coder 1.5B (Offline)';
export const LOCAL_MODEL_FILENAME = 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf';
export const LOCAL_MODEL_URL =
  'https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf';

const getBaseDir = () => {
  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error('No writable directory available on this device.');
  }
  return baseDir;
};

const getModelDir = () => `${getBaseDir()}models/`;

const STOP_WORDS = [
  '</s>',
  '<|end|>',
  '<|eot_id|>',
  '<|end_of_text|>',
  '<|im_end|>',
  '<|EOT|>',
  '<|eos|>',
  '<|endoftext|>',
  '<|end_of_turn|>',
];

let llamaContext: any = null;
let initPromise: Promise<any> | null = null;

const ensureModelDir = async () => {
  await FileSystem.makeDirectoryAsync(getModelDir(), { intermediates: true });
};

export const getLocalModelPath = () => `${getModelDir()}${LOCAL_MODEL_FILENAME}`;

export const getLocalModelInfo = async () => {
  const modelPath = getLocalModelPath();
  const info = await FileSystem.getInfoAsync(modelPath);
  return {
    exists: info.exists && (info.size ?? 0) > 0,
    size: info.size ?? 0,
    uri: modelPath,
  };
};

export const isLocalModelDownloaded = async () => {
  const info = await FileSystem.getInfoAsync(getLocalModelPath());
  return info.exists && (info.size ?? 0) > 0;
};

export const downloadLocalModel = async (onProgress?: (progress: number) => void) => {
  await ensureModelDir();
  const modelPath = getLocalModelPath();

  const download = FileSystem.createDownloadResumable(
    LOCAL_MODEL_URL,
    modelPath,
    {},
    (progress) => {
      if (!onProgress || progress.totalBytesExpectedToWrite <= 0) return;
      onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite);
    }
  );

  const result = await download.downloadAsync();
  if (!result?.uri) {
    throw new Error('Model download failed.');
  }

  return result.uri;
};

export const deleteLocalModel = async () => {
  const modelPath = getLocalModelPath();
  const info = await FileSystem.getInfoAsync(modelPath);
  if (info.exists) {
    await FileSystem.deleteAsync(modelPath, { idempotent: true });
  }
};

export const ensureLocalModelReady = async (onProgress?: (progress: number) => void) => {
  const ready = await isLocalModelDownloaded();
  if (ready) return;
  await downloadLocalModel(onProgress);
};

export const getLocalLlamaContext = async () => {
  if (!initLlama) {
    throw new Error('Local LLM not available. Use a development build to enable this feature.');
  }
  if (llamaContext) return llamaContext;
  if (!initPromise) {
    initPromise = (async () => {
      const info = await getLocalModelInfo();
      if (!info.exists) {
        throw new Error('Local model not downloaded.');
      }

      llamaContext = await initLlama({
        model: info.uri,
        use_mlock: false,
        n_ctx: 2048,
      });

      return llamaContext;
    })().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
};

export const streamLocalChat = async (
  messages: AIMessage[],
  onToken: (token: string) => void = () => {}
): Promise<AIResponse> => {
  if (!initLlama) {
    return {
      content: '',
      error: 'Local LLM not available in Expo Go. Use the development build APK for offline models.',
    };
  }

  try {
    const context = await getLocalLlamaContext();
    let streamed = '';

    const response = await context.completion(
      {
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        n_predict: 512,
        temperature: 0.7,
        stop: STOP_WORDS,
      },
      (data) => {
        if (data?.token) {
          streamed += data.token;
          onToken(data.token);
        }
      }
    );

    return {
      content: response?.text || streamed || '',
    };
  } catch (error) {
    return {
      content: 'Local model error: ' + (error as Error).message,
      error: (error as Error).message,
    };
  }
};
