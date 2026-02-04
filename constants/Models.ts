export const AI_MODELS = [
  // === 2026 FRONTIER MODELS ===
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'OpenAI',
    icon: 'sparkles',
    description: 'Latest frontier model, 400k context, fast responses',
  },
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'Anthropic',
    icon: 'trophy',
    description: 'Most intelligent for coding, agents, complex tasks (Nov 2025)',
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'Anthropic',
    icon: 'sparkles',
    description: 'Best coding model, optimized for building agents (Sep 2025)',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    icon: 'flash',
    description: 'Fastest & cost-efficient, matches Sonnet 4 performance (Oct 2025)',
  },
  {
    id: 'gemini-3-pro-preview-11-2025',
    name: 'Gemini 3 Pro',
    provider: 'Google',
    icon: 'diamond',
    description: 'Advanced multimodal, excellent reasoning (2026)',
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'Google',
    icon: 'flash',
    description: 'Ultra-fast multimodal model (2026)',
  },
  {
    id: 'grok-4',
    name: 'Grok 4',
    provider: 'xAI',
    icon: 'rocket',
    description: '2M context, real-time search, PhD-level reasoning',
  },

  // === 2025 MODELS (Still Reliable) ===
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    icon: 'bulb',
    description: 'Multimodal flagship, reliable & fast',
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    icon: 'flash-outline',
    description: 'Fast and cost-effective',
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'Google',
    icon: 'trophy',
    description: 'Advanced reasoning with 1M context',
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    icon: 'flash',
    description: 'Ultra-fast with thinking capabilities',
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    provider: 'Google',
    icon: 'flash-outline',
    description: 'Fast and efficient',
  },
  {
    id: 'claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    icon: 'sparkles',
    description: 'Excellent for coding & complex tasks',
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    icon: 'flash',
    description: 'Fast and lightweight',
  },

  // === CHINESE MODELS ===
  {
    id: 'glm-4.7-coder',
    name: 'GLM-4.7 Coder',
    provider: 'Zhipu AI',
    icon: 'code-slash',
    description: 'Chinese coding model, 128k output tokens',
  },
  {
    id: 'glm-4-coder',
    name: 'GLM-4 Coder',
    provider: 'Zhipu AI',
    icon: 'code-working',
    description: 'Fast Chinese coding assistant',
  },

  // === OPENROUTER MODELS ===
  {
    id: 'openrouter/deepseek/deepseek-r1',
    name: 'DeepSeek R1',
    provider: 'DeepSeek (OR)',
    icon: 'code-working',
    description: 'Powerful reasoning model',
  },
  {
    id: 'openrouter/google/gemma-3-1b-it',
    name: 'Gemma 3 1B',
    provider: 'Google (OR)',
    icon: 'logo-google',
    description: 'Lightweight multimodal model',
  },
  {
    id: 'openrouter/openai/gpt-oss-20b',
    name: 'GPT-OSS 20B',
    provider: 'OpenAI (OR)',
    icon: 'logo-github',
    description: 'Open-weight MoE model',
  },
  {
    id: 'openrouter/google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash Free',
    provider: 'Google (OR)',
    icon: 'flash',
    description: 'Free experimental model',
  },

  // === LOCAL MODELS ===
  {
    id: 'local-qwen2.5-coder-1.5b',
    name: 'Local Qwen2.5 Coder 1.5B',
    provider: 'On-device',
    icon: 'phone-portrait',
    description: 'Offline model (auto-download)',
  },
];
