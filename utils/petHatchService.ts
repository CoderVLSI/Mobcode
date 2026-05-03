import * as FileSystem from 'expo-file-system';
import { Pet, PetAnimation } from '../data/pets';

const PETS_DIR = `${FileSystem.documentDirectory}pets/`;
const CUSTOM_PETS_INDEX = `${PETS_DIR}index.json`;

// Animation states we generate images for + their visual prompts
const ANIMATION_STATES: { key: PetAnimation; label: string; posePrompt: string }[] = [
  { key: 'idle',    label: 'Idle',    posePrompt: 'standing neutral relaxed pose, centered' },
  { key: 'running', label: 'Running', posePrompt: 'running pose, side view, one leg raised, leaning forward' },
  { key: 'waving',  label: 'Waving',  posePrompt: 'waving one arm up high, happy friendly gesture, facing forward' },
  { key: 'jumping', label: 'Jumping', posePrompt: 'jumping in the air, arms up, excited joyful expression' },
  { key: 'failed',  label: 'Failed',  posePrompt: 'sad drooping pose, shoulders slumped, looking downward' },
];

export interface HatchProgress {
  step: string;
  current: number;
  total: number;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function buildPrompt(concept: string, posePrompt: string): string {
  return (
    `A single cute chibi mascot character: ${concept}. ` +
    `Pose: ${posePrompt}. ` +
    `Style: pixel-art-adjacent, thick dark 1-2px outlines, chunky readable silhouette, ` +
    `limited flat color palette, simple expressive face, no background, transparent or pure white background, ` +
    `centered in frame, full body visible, small and compact.`
  );
}

async function generateImage(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
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
    throw new Error(err?.error?.message || `Image generation failed (${response.status})`);
  }

  const data = await response.json();
  // gpt-image-2 returns b64_json in data[0].b64_json
  return data.data[0].b64_json as string;
}

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

export async function hatchPet(
  concept: string,
  petName: string,
  apiKey: string,
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

  for (let i = 0; i < ANIMATION_STATES.length; i++) {
    const { key, label, posePrompt } = ANIMATION_STATES[i];

    onProgress({ step: `Generating ${label} pose…`, current: i + 1, total });

    const prompt = buildPrompt(concept, posePrompt);
    const base64 = await generateImage(prompt, apiKey);

    const filePath = `${petDir}${key}.png`;
    await saveBase64Image(base64, filePath);
    animationImages[key] = filePath;
  }

  // Derive missing animations from close equivalents
  animationImages['completed'] = animationImages['jumping'];
  animationImages['review'] = animationImages['idle'];
  animationImages['waiting'] = animationImages['idle'];

  onProgress({ step: 'Packaging pet…', current: total, total });

  const pet: Pet = {
    id,
    name: petName,
    emoji: '🐾',
    description: concept,
    colors: { body: '#888', accent: '#555', eye: '#fff', shine: '#ccc' },
    animationImages,
  };

  // Write pet.json
  await FileSystem.writeAsStringAsync(
    `${petDir}pet.json`,
    JSON.stringify(pet, null, 2),
    { encoding: FileSystem.EncodingType.UTF8 }
  );

  // Update index
  const existing = await loadCustomPetIndex();
  const updated = [...existing.filter(p => p.id !== id), { id, dir: petDir }];
  await FileSystem.writeAsStringAsync(
    CUSTOM_PETS_INDEX,
    JSON.stringify(updated),
    { encoding: FileSystem.EncodingType.UTF8 }
  );

  return pet;
}

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
  if (entry) {
    await FileSystem.deleteAsync(entry.dir, { idempotent: true });
  }
  const updated = index.filter(e => e.id !== id);
  await FileSystem.writeAsStringAsync(
    CUSTOM_PETS_INDEX,
    JSON.stringify(updated),
    { encoding: FileSystem.EncodingType.UTF8 }
  );
}
