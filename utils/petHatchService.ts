import * as FileSystem from 'expo-file-system';
import { Pet, PetAnimation } from '../data/pets';

const PETS_DIR = `${FileSystem.documentDirectory}pets/`;
const CUSTOM_PETS_INDEX = `${PETS_DIR}index.json`;

export type ImageProvider = 'gemini-text' | 'openai';

export interface HatchProgress {
  step: string;
  current: number;
  total: number;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Gemini text → SVG (FREE, single API call for all poses) ──────────────

const SVG_SYSTEM_PROMPT = `You are a pixel-art SVG generator for mobile app mascot pets.
Generate cute chibi-style SVG characters at 200x200px.
Rules:
- Use viewBox="0 0 200 200", width="200", height="200"
- Thick 2px dark outlines on all shapes
- Limited flat color palette (4-6 colors max)
- Simple expressive face: dot eyes, curved mouth
- No text, no gradients, no shadows
- Pure white background rect first
- Full body visible and centered
- Return ONLY valid SVG markup, no explanation`;

const POSE_DESCRIPTIONS = {
  idle:    'standing upright, relaxed, arms at sides, facing viewer, neutral happy expression',
  running: 'side view, leaning forward, one leg raised behind, arms pumping, determined face',
  waving:  'facing viewer, one arm raised high waving, other arm at side, big smile',
  jumping: 'in the air, both arms raised up, legs bent, joyful excited expression',
  failed:  'hunched over, shoulders drooped, arms hanging low, sad face with downturned mouth',
};

async function generateAllPosesGemini(
  concept: string,
  apiKey: string,
  onProgress: (p: HatchProgress) => void
): Promise<Record<string, string>> {
  onProgress({ step: 'Asking Gemini to design your pet…', current: 1, total: 2 });

  const prompt =
    `Create a cute chibi mascot pet based on this concept: "${concept}".
Design the character with a consistent look across all poses.
Return a JSON object with exactly these keys: idle, running, waving, jumping, failed.
Each value must be a complete standalone SVG string (200x200px) showing the character in that pose.

Pose descriptions:
- idle: ${POSE_DESCRIPTIONS.idle}
- running: ${POSE_DESCRIPTIONS.running}
- waving: ${POSE_DESCRIPTIONS.waving}
- jumping: ${POSE_DESCRIPTIONS.jumping}
- failed: ${POSE_DESCRIPTIONS.failed}

${SVG_SYSTEM_PROMPT}

Respond with ONLY a raw JSON object. No markdown, no code fences, no explanation. Example format:
{"idle":"<svg ...>...</svg>","running":"<svg ...>...</svg>","waving":"<svg ...>...</svg>","jumping":"<svg ...>...</svg>","failed":"<svg ...>...</svg>"}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 16384 },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini text gen failed (${response.status})`);
  }

  const data = await response.json();
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '').trim();

  onProgress({ step: 'Parsing SVG poses…', current: 2, total: 2 });

  let svgs: Record<string, string>;
  try {
    svgs = JSON.parse(cleaned);
  } catch {
    // Try extracting JSON from within the text
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Gemini returned invalid JSON — try again');
    svgs = JSON.parse(match[0]);
  }

  const required = ['idle', 'running', 'waving', 'jumping', 'failed'];
  for (const key of required) {
    if (!svgs[key]) throw new Error(`Gemini missing pose: ${key}`);
  }

  return svgs;
}

// ─── OpenAI gpt-image-2 (paid, 5 separate image gen calls) ────────────────

const POSE_PROMPTS: Record<string, string> = {
  idle:    'standing neutral relaxed pose, centered, facing viewer',
  running: 'running pose, side view, one leg raised, leaning forward energetically',
  waving:  'waving one arm up high, big smile, friendly greeting, facing viewer',
  jumping: 'jumping in the air, both arms raised, joyful excited expression',
  failed:  'sad drooping pose, shoulders slumped, looking downward, dejected',
};

async function generateOpenAIImage(concept: string, poseKey: string, apiKey: string): Promise<string> {
  const prompt =
    `A single cute chibi mascot character: ${concept}. ` +
    `Pose: ${POSE_PROMPTS[poseKey]}. ` +
    `Style: pixel-art-adjacent, thick dark outlines, limited flat palette, white background, full body centered.`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-image-2', prompt, n: 1, size: '1024x1024', output_format: 'png' }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `gpt-image-2 failed (${response.status})`);
  }
  const data = await response.json();
  return data.data[0].b64_json as string;
}

// ─── Shared storage helpers ────────────────────────────────────────────────

async function ensurePetsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PETS_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(PETS_DIR, { intermediates: true });
}

// ─── Main hatch function ───────────────────────────────────────────────────

const POSE_KEYS = ['idle', 'running', 'waving', 'jumping', 'failed'] as const;

export async function hatchPet(
  concept: string,
  petName: string,
  apiKey: string,
  provider: ImageProvider,
  onProgress: (progress: HatchProgress) => void
): Promise<Pet> {
  await ensurePetsDir();

  const id = slugify(petName) || `pet-${Date.now()}`;
  const petDir = `${PETS_DIR}${id}/`;
  const dirInfo = await FileSystem.getInfoAsync(petDir);
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(petDir, { intermediates: true });

  const animationImages: Record<string, string> = {};

  if (provider === 'gemini-text') {
    // Single Gemini text call → all SVGs at once
    const svgs = await generateAllPosesGemini(concept, apiKey, onProgress);

    for (const key of POSE_KEYS) {
      const filePath = `${petDir}${key}.svg`;
      await FileSystem.writeAsStringAsync(filePath, svgs[key], { encoding: FileSystem.EncodingType.UTF8 });
      animationImages[key] = filePath;
    }
  } else {
    // gpt-image-2: 5 separate image gen calls
    const total = POSE_KEYS.length;
    for (let i = 0; i < POSE_KEYS.length; i++) {
      const key = POSE_KEYS[i];
      onProgress({ step: `Generating ${key} pose…`, current: i + 1, total });
      const base64 = await generateOpenAIImage(concept, key, apiKey);
      const filePath = `${petDir}${key}.png`;
      await FileSystem.writeAsStringAsync(filePath, base64, { encoding: FileSystem.EncodingType.Base64 });
      animationImages[key] = filePath;
    }
  }

  // Derive missing states
  animationImages['completed'] = animationImages['jumping'];
  animationImages['review']    = animationImages['idle'];
  animationImages['waiting']   = animationImages['idle'];

  onProgress({ step: 'Packaging pet…', current: 2, total: 2 });

  const pet: Pet = {
    id,
    name: petName,
    emoji: '🐾',
    description: concept,
    colors: { body: '#888', accent: '#555', eye: '#fff', shine: '#ccc' },
    animationImages,
    isCustom: true,
    isSvg: provider === 'gemini-text',
  };

  await FileSystem.writeAsStringAsync(`${petDir}pet.json`, JSON.stringify(pet, null, 2), { encoding: FileSystem.EncodingType.UTF8 });

  const existing = await loadCustomPetIndex();
  await FileSystem.writeAsStringAsync(
    CUSTOM_PETS_INDEX,
    JSON.stringify([...existing.filter(p => p.id !== id), { id, dir: petDir }]),
    { encoding: FileSystem.EncodingType.UTF8 }
  );

  return pet;
}

async function loadCustomPetIndex(): Promise<{ id: string; dir: string }[]> {
  const info = await FileSystem.getInfoAsync(CUSTOM_PETS_INDEX);
  if (!info.exists) return [];
  return JSON.parse(await FileSystem.readAsStringAsync(CUSTOM_PETS_INDEX));
}

export async function loadCustomPets(): Promise<Pet[]> {
  try {
    const index = await loadCustomPetIndex();
    const pets: Pet[] = [];
    for (const entry of index) {
      const jsonPath = `${entry.dir}pet.json`;
      const info = await FileSystem.getInfoAsync(jsonPath);
      if (!info.exists) continue;
      pets.push(JSON.parse(await FileSystem.readAsStringAsync(jsonPath)));
    }
    return pets;
  } catch { return []; }
}

export async function deleteCustomPet(id: string): Promise<void> {
  const index = await loadCustomPetIndex();
  const entry = index.find(e => e.id === id);
  if (entry) await FileSystem.deleteAsync(entry.dir, { idempotent: true });
  await FileSystem.writeAsStringAsync(
    CUSTOM_PETS_INDEX,
    JSON.stringify(index.filter(e => e.id !== id)),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
}
