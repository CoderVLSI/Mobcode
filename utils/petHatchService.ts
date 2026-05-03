import * as FileSystem from 'expo-file-system';
import { Pet, PetAnimation } from '../data/pets';

const PETS_DIR = `${FileSystem.documentDirectory}pets/`;
const CUSTOM_PETS_INDEX = `${PETS_DIR}index.json`;

export type ImageProvider = 'openai' | 'gemini';

// Animation states + pose prompts
const ANIMATION_STATES: { key: PetAnimation; label: string; posePrompt: string }[] = [
  { key: 'idle',    label: 'Idle',    posePrompt: 'standing neutral relaxed pose, centered, facing viewer' },
  { key: 'running', label: 'Running', posePrompt: 'running pose, side view, one leg raised, leaning forward energetically' },
  { key: 'waving',  label: 'Waving',  posePrompt: 'waving one arm up high, big smile, friendly greeting, facing viewer' },
  { key: 'jumping', label: 'Jumping', posePrompt: 'jumping in the air, both arms raised, joyful excited expression' },
  { key: 'failed',  label: 'Failed',  posePrompt: 'sad drooping pose, shoulders slumped, looking downward, dejected' },
];

export interface HatchProgress {
  step: string;
  current: number;
  total: number;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildBasePrompt(concept: string, posePrompt: string): string {
  return (
    `A single cute chibi mascot character: ${concept}. ` +
    `Pose: ${posePrompt}. ` +
    `Style: pixel-art-adjacent, thick dark 1-2px outlines, chunky readable silhouette, ` +
    `limited flat color palette, simple expressive face, pure white background, ` +
    `centered in frame, full body visible, small and compact.`
  );
}

// ─── OpenAI gpt-image-2 ────────────────────────────────────────────────────

async function generateOpenAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: '1024x1024',
      output_format: 'png',
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI image gen failed (${response.status})`);
  }
  const data = await response.json();
  return data.data[0].b64_json as string;
}

// ─── Gemini 3.1 Flash Image ────────────────────────────────────────────────
// Uses multi-turn: idle pose is generated first, then used as a reference
// image for all subsequent poses to keep the character consistent.

async function generateGeminiBase(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '1:1' },
      },
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini image gen failed (${response.status})`);
  }
  const data = await response.json();
  const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!part) throw new Error('Gemini returned no image data');
  return part.inlineData.data as string; // base64
}

// Multi-turn: pass the idle reference image + new pose prompt for consistency
async function generateGeminiWithReference(
  prompt: string,
  referenceBase64: string,
  apiKey: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: 'image/png',
                data: referenceBase64,
              },
            },
            {
              text:
                `This is the reference character. Generate a new image of the EXACT SAME character in this new pose: ${prompt}. ` +
                `Keep identical colors, proportions, style, and features. Pure white background.`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '1:1' },
      },
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Gemini image gen failed (${response.status})`);
  }
  const data = await response.json();
  const part = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (!part) throw new Error('Gemini returned no image data');
  return part.inlineData.data as string;
}

// ─── Shared helpers ────────────────────────────────────────────────────────

async function ensurePetsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PETS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(PETS_DIR, { intermediates: true });
  }
}

async function saveBase64Image(base64: string, filePath: string): Promise<void> {
  await FileSystem.writeAsStringAsync(filePath, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

// ─── Main hatch function ───────────────────────────────────────────────────

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
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(petDir, { intermediates: true });
  }

  const animationImages: Record<string, string> = {};
  const total = ANIMATION_STATES.length;
  let idleBase64: string | null = null; // used as Gemini reference for subsequent poses

  for (let i = 0; i < ANIMATION_STATES.length; i++) {
    const { key, label, posePrompt } = ANIMATION_STATES[i];
    onProgress({ step: `Generating ${label} pose…`, current: i + 1, total });

    const prompt = buildBasePrompt(concept, posePrompt);
    let base64: string;

    if (provider === 'gemini') {
      if (i === 0) {
        // First pose — generate fresh
        base64 = await generateGeminiBase(prompt, apiKey);
        idleBase64 = base64;
      } else {
        // Subsequent poses — use idle as reference for consistency
        base64 = await generateGeminiWithReference(posePrompt, idleBase64!, apiKey);
      }
    } else {
      base64 = await generateOpenAI(prompt, apiKey);
    }

    const filePath = `${petDir}${key}.png`;
    await saveBase64Image(base64, filePath);
    animationImages[key] = filePath;
  }

  // Derive missing states from closest equivalents
  animationImages['completed'] = animationImages['jumping'];
  animationImages['review']    = animationImages['idle'];
  animationImages['waiting']   = animationImages['idle'];

  onProgress({ step: 'Packaging pet…', current: total, total });

  const pet: Pet = {
    id,
    name: petName,
    emoji: '🐾',
    description: concept,
    colors: { body: '#888', accent: '#555', eye: '#fff', shine: '#ccc' },
    animationImages,
    isCustom: true,
  };

  await FileSystem.writeAsStringAsync(
    `${petDir}pet.json`,
    JSON.stringify(pet, null, 2),
    { encoding: FileSystem.EncodingType.UTF8 }
  );

  const existing = await loadCustomPetIndex();
  const updated = [...existing.filter(p => p.id !== id), { id, dir: petDir }];
  await FileSystem.writeAsStringAsync(
    CUSTOM_PETS_INDEX,
    JSON.stringify(updated),
    { encoding: FileSystem.EncodingType.UTF8 }
  );

  return pet;
}

// ─── Storage helpers ───────────────────────────────────────────────────────

async function loadCustomPetIndex(): Promise<{ id: string; dir: string }[]> {
  const info = await FileSystem.getInfoAsync(CUSTOM_PETS_INDEX);
  if (!info.exists) return [];
  const raw = await FileSystem.readAsStringAsync(CUSTOM_PETS_INDEX);
  return JSON.parse(raw);
}

export async function loadCustomPets(): Promise<Pet[]> {
  try {
    const index = await loadCustomPetIndex();
    const pets: Pet[] = [];
    for (const entry of index) {
      const jsonPath = `${entry.dir}pet.json`;
      const info = await FileSystem.getInfoAsync(jsonPath);
      if (!info.exists) continue;
      const raw = await FileSystem.readAsStringAsync(jsonPath);
      pets.push(JSON.parse(raw));
    }
    return pets;
  } catch {
    return [];
  }
}

export async function deleteCustomPet(id: string): Promise<void> {
  const index = await loadCustomPetIndex();
  const entry = index.find(e => e.id === id);
  if (entry) await FileSystem.deleteAsync(entry.dir, { idempotent: true });
  const updated = index.filter(e => e.id !== id);
  await FileSystem.writeAsStringAsync(
    CUSTOM_PETS_INDEX,
    JSON.stringify(updated),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
}
