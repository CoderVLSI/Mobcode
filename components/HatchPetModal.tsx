import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { hatchPet, HatchProgress, ImageProvider } from '../utils/petHatchService';
import { Pet } from '../data/pets';

interface HatchPetModalProps {
  visible: boolean;
  openAIKey: string;
  geminiKey: string;
  onClose: () => void;
  onHatched: (pet: Pet) => void;
}

const TOTAL_STEPS = 5;

const EXAMPLE_CONCEPTS = [
  'a tiny wizard cat with a pointy hat',
  'a chubby robot with glowing eyes',
  'a sleepy panda holding a coffee cup',
  'a fierce red dragon with stubby wings',
  'a bouncy green frog with a crown',
];

export function HatchPetModal({ visible, openAIKey, geminiKey, onClose, onHatched }: HatchPetModalProps) {
  const { theme } = useTheme();
  const [concept, setConcept] = useState('');
  const [petName, setPetName] = useState('');
  const [provider, setProvider] = useState<ImageProvider>('gemini-svg');
  const [isHatching, setIsHatching] = useState(false);
  const [progress, setProgress] = useState<HatchProgress | null>(null);
  const [hatchedPet, setHatchedPet] = useState<Pet | null>(null);
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});

  const reset = () => {
    setConcept('');
    setPetName('');
    setIsHatching(false);
    setProgress(null);
    setHatchedPet(null);
    setPreviewImages({});
  };

  const handleClose = () => {
    if (isHatching) return;
    reset();
    onClose();
  };

  const activeKey = provider === 'openai' ? openAIKey : geminiKey;

  const handleHatch = async () => {
    if (!concept.trim()) {
      Alert.alert('Describe your pet', 'Tell us what kind of pet to hatch.');
      return;
    }
    if (!petName.trim()) {
      Alert.alert('Name your pet', 'Give your pet a name first.');
      return;
    }
    if (!activeKey) {
      if (provider !== 'openai') {
        Alert.alert(
          'Gemini key needed',
          'Add your Gemini API key in Settings. It\'s free at aistudio.google.com — no billing required.'
        );
      } else {
        Alert.alert('OpenAI key needed', 'Add your OpenAI API key in Settings. Note: gpt-image-2 costs image credits.');
      }
      return;
    }

    setIsHatching(true);
    setHatchedPet(null);
    setPreviewImages({});

    try {
      const pet = await hatchPet(
        concept.trim(),
        petName.trim(),
        activeKey,
        provider,
        (p) => {
          setProgress(p);
          // Show preview images as they arrive
          if (pet?.animationImages) {
            setPreviewImages({ ...pet.animationImages });
          }
        }
      );
      setHatchedPet(pet);
      setPreviewImages(pet.animationImages ?? {});
    } catch (err: any) {
      Alert.alert('Hatch failed', err.message || 'Something went wrong generating your pet.');
    } finally {
      setIsHatching(false);
      setProgress(null);
    }
  };

  const handleAdd = () => {
    if (!hatchedPet) return;
    onHatched(hatchedPet);
    reset();
    onClose();
  };

  const progressPct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={handleClose} />
      <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>✨ Hatch a Pet</Text>
          {!isHatching && (
            <TouchableOpacity onPress={handleClose}>
              <Text style={[styles.closeBtn, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {!isHatching && !hatchedPet && (
            <>
              {/* Provider picker */}
              <Text style={[styles.label, { color: theme.textSecondary }]}>Image model</Text>
              <View style={styles.providerRow}>
                {([
                  { id: 'gemini-svg', label: 'Gemini 2.5 Flash',       sub: '✅ free · SVG · 1 call',   hasKey: !!geminiKey },
                  { id: 'gemini',     label: 'Gemini 3.1 Flash Image',  sub: '💰 paid · PNG · 1 call',   hasKey: !!geminiKey },
                  { id: 'openai',     label: 'gpt-image-2',             sub: '💰 paid · PNG · 1 call',   hasKey: !!openAIKey },
                ] as const).map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.providerCard,
                      { borderColor: provider === p.id ? theme.accent : theme.border, backgroundColor: theme.background },
                    ]}
                    onPress={() => setProvider(p.id)}
                  >
                    <Text style={[styles.providerName, { color: provider === p.id ? theme.accent : theme.text }]}>{p.label}</Text>
                    <Text style={[styles.providerSub, { color: theme.textSecondary }]}>{p.sub}</Text>
                    {!p.hasKey && <Text style={[styles.providerNoKey, { color: theme.warning }]}>no key set</Text>}
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Concept</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. a tiny wizard cat with a pointy hat"
                placeholderTextColor={theme.placeholder}
                value={concept}
                onChangeText={setConcept}
                multiline
              />

              {/* Example chips */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
                {EXAMPLE_CONCEPTS.map(ex => (
                  <TouchableOpacity
                    key={ex}
                    style={[styles.chip, { backgroundColor: theme.surfaceHover, borderColor: theme.border }]}
                    onPress={() => setConcept(ex)}
                  >
                    <Text style={[styles.chipText, { color: theme.textSecondary }]} numberOfLines={1}>{ex}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Pet name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Merlin"
                placeholderTextColor={theme.placeholder}
                value={petName}
                onChangeText={setPetName}
              />

              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                {provider === 'gemini-svg'
                  ? 'Gemini 2.5 Flash generates all poses as SVG art in one free call — no image credits needed.'
                  : provider === 'gemini'
                  ? 'Gemini 3.1 Flash Image generates a full sprite strip in one call. ~$0.07 per hatch.'
                  : 'gpt-image-2 generates a full sprite strip in one call. Uses OpenAI image credits.'
                }
              </Text>

              <TouchableOpacity
                style={[styles.hatchBtn, { backgroundColor: theme.accent, opacity: concept.trim() && petName.trim() ? 1 : 0.4 }]}
                onPress={handleHatch}
                disabled={!concept.trim() || !petName.trim()}
              >
                <Text style={styles.hatchBtnText}>🥚 Hatch</Text>
              </TouchableOpacity>
            </>
          )}

          {isHatching && (
            <View style={styles.hatchingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.hatchingLabel, { color: theme.text }]}>
                {progress?.step ?? 'Starting…'}
              </Text>

              {/* Progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${progressPct}%` }]} />
              </View>
              <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                {progress ? `${progress.current} / ${progress.total}` : ''}
              </Text>

              <Text style={[styles.hint, { color: theme.textSecondary, textAlign: 'center', marginTop: 12 }]}>
                {'Generating sprite strip — all 5 poses in one image…'}
              </Text>
            </View>
          )}

          {hatchedPet && !isHatching && (
            <>
              <Text style={[styles.successTitle, { color: theme.text }]}>
                🎉 {hatchedPet.name} is ready!
              </Text>

              {/* Preview grid */}
              <View style={styles.previewGrid}>
                {Object.entries(previewImages).slice(0, 5).map(([anim, uri]) => (
                  <View key={anim} style={[styles.previewCell, { borderColor: theme.border }]}>
                    <Image source={{ uri: `file://${uri}` }} style={styles.previewImage} />
                    <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>{anim}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.hatchBtn, { backgroundColor: '#00c16a' }]}
                onPress={handleAdd}
              >
                <Text style={styles.hatchBtnText}>Add to collection</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={reset} style={styles.retryBtn}>
                <Text style={[styles.retryText, { color: theme.textSecondary }]}>Hatch a different one</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderTopWidth: 1,
    maxHeight: '88%',
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 18, fontWeight: '700' },
  closeBtn: { fontSize: 15 },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 14 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 44,
  },
  chips: { marginTop: 8, marginBottom: 4 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    maxWidth: 200,
  },
  chipText: { fontSize: 12 },
  hint: { fontSize: 12, marginTop: 10, lineHeight: 18 },
  hatchBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  hatchBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hatchingContainer: { alignItems: 'center', paddingVertical: 32, gap: 14 },
  hatchingLabel: { fontSize: 15, fontWeight: '500', textAlign: 'center' },
  progressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12 },
  successTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 8,
  },
  previewCell: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    width: 100,
  },
  previewImage: { width: 80, height: 80, borderRadius: 8, resizeMode: 'contain' },
  previewLabel: { fontSize: 11, marginTop: 4, textTransform: 'capitalize' },
  retryBtn: { alignItems: 'center', marginTop: 12 },
  retryText: { fontSize: 14 },
  providerRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  providerCard: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    gap: 2,
  },
  providerName: { fontSize: 12, fontWeight: '700' },
  providerSub: { fontSize: 11 },
  providerNoKey: { fontSize: 10, fontWeight: '600', marginTop: 2 },
});
