# ExecuTorch Local Inference Setup

## Overview
Run LFM2.5-1.2B-Thinking (or any PyTorch model) locally on mobile using ExecuTorch.

## Prerequisites
- Python 3.10+
- Android Studio (for Android) or Xcode (for iOS)
- Conda/venv

## Step 1: Install ExecuTorch

```bash
# Create conda environment
conda create -n executorch python=3.10
conda activate executorch

# Install ExecuTorch
git clone https://github.com/pytorch/executorch.git
cd executorch
./install_requirements.sh
```

## Step 2: Export Model to ExecuTorch

```python
# export_model.py
import torch
from executorch.examine import generate_etrecord

# Load the model
from transformers import AutoModelForCausalLM, AutoTokenizer

model_id = "LiquidAI/LFM2.5-1.2B-Thinking"
model = AutoModelForCausalLM.from_pretrained(
    model_id,
    torch_dtype=torch.float32,  # ExecuTorch needs float32
    trust_remote_code=True
)
tokenizer = AutoTokenizer.from_pretrained(model_id)

# Export to ExecuTorch format
from executorch.exir import to_exir

example_inputs = (tokenizer("Hello", return_tensors="pt")["input_ids"],)

etprogram = to_exir(
    model,
    example_inputs,
)

# Save
etprogram.save_to_file("lfm2_5.pte")
```

## Step 3: Build for Android

```bash
# In executorch directory
cd examples/models/llama2

# Build Android library
./build_android.sh

# This generates: executorch/lib/libexecutorch.so
```

## Step 4: React Native Integration

### Option A: Pre-built AAR (Simpler)
```bash
# Download or build the AAR
# Place in: android/app/libs/
```

### Option B: JNI Wrapper

Create native Android module that loads ExecuTorch:

```cpp
// android/app/src/main/cpp/ExecutorchRunner.cpp
#include <executorch/extension/data_loader/mmap_data_loader.h>
#include <executorch/extension/module/module.h>
#include <executorch/runtime/core/exec_aton/exec_aton.h>
#include <executorch/sdk/eval/methods.h>

#include <jni.h>
#include <string>

extern "C" JNIEXPORT jstring JNICALL
Java_com_mobcode_ExecutorchModule_generate(
    JNIEnv* env,
    jobject /* this */,
    jstring prompt_str
) {
    // Load model
    const char* prompt = env->GetStringUTFChars(prompt_str, nullptr);

    // Load .pte file
    const char* model_path = "/data/local/tmp/lfm2_5.pte";

    // Run inference
    // ... (ExecuTorch inference code)

    env->ReleaseStringUTFChars(prompt_str, prompt);
    return env->NewStringUTF("response");
}
```

### React Native Bridge

```typescript
// utils/executorch.ts
import { NativeModules, Platform } from 'react-native';

const { ExecutorchModule } = NativeModules;

export interface ExecutorchResponse {
  text: string;
  tokensPerSecond?: number;
}

export class ExecutorchService {
  async generate(prompt: string): Promise<ExecutorchResponse> {
    if (Platform.OS === 'android' && ExecutorchModule) {
      return await ExecutorchModule.generate(prompt);
    }
    throw new Error('ExecuTorch not available on this platform');
  }

  async isAvailable(): Promise<boolean> {
    if (Platform.OS === 'android' && ExecutorchModule) {
      return await ExecutorchModule.isAvailable();
    }
    return false;
  }

  getModelInfo(): { name: string; size: string } {
    return {
      name: 'LFM2.5-1.2B-Thinking',
      size: '~2.4GB (quantized)'
    };
  }
}

export const executorchService = new ExecutorchService();
```

## Step 5: Integrate into AI Service

```typescript
// utils/aiService.ts - Add to AIService class

private async callExecutorch(messages: AIMessage[]): Promise<AIResponse> {
  try {
    const prompt = messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');

    const response = await executorchService.generate(prompt);

    return {
      content: response.text,
    };
  } catch (error) {
    return {
      content: 'ExecuTorch error: ' + (error as Error).message,
      error: (error as Error).message,
    };
  }
}
```

## Alternative: Ollama (Easier Setup)

If ExecuTorch is too complex, use Ollama:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Run LFM2.5 (or compatible model)
ollama run llama3.2:1b

# Start server
ollama serve
```

Then add as custom model in app:
- Name: `lfm2.5`
- Endpoint: `http://localhost:11434/v1/chat/completions`
- API Key: `ollama`

## Model Size Reference

| Model | Quantized Size | RAM Required |
|-------|---------------|--------------|
| LFM2.5-1.2B | ~1GB | 2GB |
| Llama-3.2-1B | ~700MB | 1.5GB |
| Llama-3.2-3B | ~2GB | 4GB |

## Quick Start Commands

```bash
# Clone ExecuTorch
git clone https://github.com/pytorch/executorch.git

# Export model
python export_model.py

# Test locally
python test_inference.py

# Build for Android
cd executorch && buck build //examples/models/llama:llama_demo
```

## Recommended for Mobcode

**Start with Ollama** for testing:
- Simple to set up
- Works with existing custom model API
- Good for development

**Move to ExecuTorch** for production:
- True on-device inference
- No network needed
- Better performance

Want me to create the Ollama setup files first (simpler), or go full ExecuTorch native module?
