import * as FileSystem from 'expo-file-system';
import { Pet, PetAnimation } from '../data/pets';

const PETS_DIR = `${FileSystem.documentDirectory}pets/`;
const CUSTOM_PETS_INDEX = `${PETS_DIR}index.json`;

export type ImageProvider = 'gemini' | 'openai';

// Strip layout: 5 poses side by side, each cell 256x256 → total 1280x256
export const STRIP_CELL_SIZE = 256;
export const STRIP_POSES = ['idle', 'running', 'waving', 'jumping', 'failed'] as const;

export interface HatchProgress {
  step: string;
  current: number;
  total: number;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// ─── Gemini image model — ONE call, full sprite strip ─────────────────────

async function generateStripGemini(concept: string, apiKey: string): Promise<string> {
  const prompt =
    `Generate a sprite sheet strip for a cute chibi mascot character: "${concept}".
The image must be exactly 5 panels arranged LEFT TO RIGHT in a single horizontal strip.
Each panel is 256x256 pixels. Total image size: 1280x256.
Panels in order (left to right):
1. IDLE — standing upright, relaxed, facing viewer, neutral happy expression
2. RUNNING — side view, leaning forward, one leg raised, arms pumping
3. WAVING — facing viewer, one arm raised high, big smile
4. JUMPING — in the air, both arms raised up, joyful expression
5. FAILED — hunched, shoulders drooped, sad downturned mouth

Style rules:
- Consistent character design across ALL panels (same colors, proportions, features)
- Pixel-art-adjacent: thick dark 2px outlines, chunky silhouette, flat colors
- White background in each panel
- Full body visible and centered in each panel
- Clear thin dividing line between panels`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '5:1' },
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
  return part.inlineData.data as string; // base64 PNG
}

// ─── OpenAI gpt-image-2 — ONE call, full sprite strip ────────────────────

async function generateStripOpenAI(concept: string, apiKey: string): Promise<string> {
  const prompt =
    `Sprite sheet strip for a cute chibi mascot: "${concept}".
5 panels left to right (each 256x256, total 1280x256):
1-IDLE: standing relaxed facing viewer | 2-RUNNING: side view leaning forward one leg raised | 3-WAVING: arm raised high big smile | 4-JUMPING: both arms up joyful | 5-FAILED: hunched sad drooping
Style: pixel-art chibi, thick dark outlines, flat colors, white background per panel, consistent character across all panels.`;

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt,
      n: 1,
      size: '1536x1024',
      output_format: 'png',
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `gpt-image-2 failed (${response.status})`);
  }
  const data = await response.json();
  return data.data[0].b64_json as string;
}

// ─── Shared helpers ────────────────────────────────────────────────────────

async function ensurePetsDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(PETS_DIR);
  if (!info.exists) await FileSystem.makeDirectoryAsync(PETS_DIR, { intermediates: true });
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
  if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(petDir, { intermediates: true });

  onProgress({ step: 'Generating all poses in one shot…', current: 1, total: 2 });

  const base64 = provider === 'gemini'
    ? await generateStripGemini(concept, apiKey)
    : await generateStripOpenAI(concept, apiKey);

  onProgress({ step: 'Saving sprite strip…', current: 2, total: 2 });

  const stripPath = `${petDir}strip.png`;
  await FileSystem.writeAsStringAsync(stripPath, base64, { encoding: FileSystem.EncodingType.Base64 });

  const pet: Pet = {
    id,
    name: petName,
    emoji: '🐾',
    description: concept,
    colors: { body: '#888', accent: '#555', eye: '#fff', shine: '#ccc' },
    stripPath,
    isCustom: true,
  };

  await FileSystem.writeAsStringAsync(
    `${petDir}pet.json`,
    JSON.stringify(pet, null, 2),
    { encoding: FileSystem.EncodingType.UTF8 }
  );

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
