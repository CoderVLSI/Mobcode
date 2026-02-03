import * as FileSystem from 'expo-file-system/legacy';
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
  // Try multiple fallback paths for different environments
  const possibleDirs = [
    FileSystem.documentDirectory,
    FileSystem.cacheDirectory,
    '/data/user/0/com.indiccoder.cursorchat/files/',
    '/storage/emulated/0/Android/data/com.indiccoder.cursorchat/files/',
  ];

  for (const dir of possibleDirs) {
    if (dir) {
      // Only log once to avoid spam
      if (!getBaseDir['logged']) {
        console.log('Using base directory:', dir);
        getBaseDir['logged'] = true;
      }
      return dir;
    }
  }

  throw new Error('No writable directory available. Please check app permissions or use a cloud model instead.');
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
  const modelDir = getModelDir();
  console.log('Ensuring model directory exists:', modelDir);

  try {
    // Check if directory exists first
    const info = await FileSystem.getInfoAsync(modelDir);
    if (!info.exists) {
      console.log('Creating models directory...');
      await FileSystem.makeDirectoryAsync(modelDir, { intermediates: true, idempotent: true });
    }
    console.log('Model directory ready:', modelDir);
  } catch (error) {
    console.error('Failed to create model directory:', error);
    throw new Error(`Cannot create models directory: ${(error as Error).message}`);
  }
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
    throw new Error('Local LLM not available. The llama.rn module is not installed or this is running in Expo Go.');
  }
  if (llamaContext) return llamaContext;
  if (!initPromise) {
    initPromise = (async () => {
      const info = await getLocalModelInfo();
      if (!info.exists) {
        throw new Error('Local model not downloaded. Please download the model first.');
      }

      console.log('Initializing llama.rn with model:', info.uri);

      try {
        // llama.rn requires file:// prefix for local paths
        let modelPath = info.uri;
        if (!modelPath.startsWith('file://')) {
          modelPath = `file://${modelPath}`;
        }

        console.log('Initializing llama.rn with model:', modelPath);

        // Use llamaContext directly if initLlama is not available
        if (!initLlama || typeof initLlama !== 'function') {
          throw new Error('llama.rn initLlama function is not available. The module may not be properly linked.');
        }

        llamaContext = await initLlama({
          model: modelPath,
          use_mlock: false,
          n_ctx: 2048,
          n_gpu_layers: 0, // Use CPU only
          n_threads: 4, // Use 4 threads for better performance
        });

        console.log('Llama context initialized successfully');
        return llamaContext;
      } catch (error) {
        console.error('Failed to initialize llama.rn:', error);
        console.error('Error details:', JSON.stringify(error));
        throw new Error(`Llama initialization failed: ${(error as Error).message}. Please ensure you are using the EAS build, not Expo Go.`);
      }
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
