import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  PanResponder,
  Animated,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePet, AgentStatus } from '../context/PetContext';
import { PetSprite } from './PetSprite';
import { HatchPetModal } from './HatchPetModal';
import { useTheme } from '../context/ThemeContext';
import { BUILT_IN_PETS } from '../data/pets';
import { storage } from '../utils/storage';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const PET_SIZE = 64;
const BUBBLE_MAX_W = 200;

const STATUS_LABELS: Record<AgentStatus, string> = {
  idle: 'Ready',
  running: 'Working…',
  waiting: 'Waiting for input',
  review: 'Reviewing code',
  failed: 'Something went wrong',
  completed: 'Done!',
};

const STATUS_COLORS: Record<AgentStatus, string> = {
  idle: '#888888',
  running: '#3291ff',
  waiting: '#f5a623',
  review: '#9b59b6',
  failed: '#e00000',
  completed: '#00c16a',
};

export function PetOverlay() {
  const { activePet, isVisible, animation, agentStatus, allPets, setActivePet, hidePet, addCustomPet, removeCustomPet } = usePet();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [showPicker, setShowPicker] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const [showHatch, setShowHatch] = useState(false);
  const [openAIKey, setOpenAIKey] = useState('');

  useEffect(() => {
    storage.getOpenAIKey().then(setOpenAIKey).catch(() => {});
  }, [showHatch]);

  // Drag position — start bottom-right
  const pan = useRef(new Animated.ValueXY({
    x: SCREEN_W - PET_SIZE - 24,
    y: SCREEN_H - PET_SIZE - 120 - insets.bottom,
  })).current;

  // Show status bubble briefly when agent status changes
  const bubbleTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (agentStatus !== 'idle') {
      setShowBubble(true);
      if (bubbleTimeout.current) clearTimeout(bubbleTimeout.current);
      bubbleTimeout.current = setTimeout(() => setShowBubble(false), 3000);
    } else {
      setShowBubble(false);
    }
    return () => {
      if (bubbleTimeout.current) clearTimeout(bubbleTimeout.current);
    };
  }, [agentStatus]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, { dx, dy }) => Math.abs(dx) > 4 || Math.abs(dy) > 4,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, { dx, dy }) => {
        pan.flattenOffset();
        // Clamp to screen bounds
        const clampedX = Math.max(0, Math.min(SCREEN_W - PET_SIZE, (pan.x as any)._value));
        const clampedY = Math.max(insets.top + 8, Math.min(SCREEN_H - PET_SIZE - insets.bottom - 60, (pan.y as any)._value));
        Animated.spring(pan, { toValue: { x: clampedX, y: clampedY }, useNativeDriver: false }).start();

        // If barely moved, treat as tap → toggle bubble
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
          setShowBubble(v => !v);
        }
      },
    })
  ).current;

  if (!isVisible) return null;

  return (
    <>
      {/* Floating pet */}
      <Animated.View
        style={[styles.floatingPet, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}
        {...panResponder.panHandlers}
      >
        {/* Status bubble */}
        {showBubble && (
          <View style={[styles.bubble, { backgroundColor: theme.surface, borderColor: STATUS_COLORS[agentStatus] }]}>
            <View style={[styles.bubbleDot, { backgroundColor: STATUS_COLORS[agentStatus] }]} />
            <Text style={[styles.bubbleText, { color: theme.text }]} numberOfLines={2}>
              {STATUS_LABELS[agentStatus]}
            </Text>
          </View>
        )}

        <PetSprite pet={activePet} animation={animation} size={PET_SIZE} />

        {/* Pet name label */}
        <View style={[styles.nameTag, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.nameText, { color: theme.textSecondary }]}>{activePet.name}</Text>
        </View>

        {/* Change pet button */}
        <TouchableOpacity
          style={[styles.changeBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={() => setShowPicker(true)}
        >
          <Text style={{ fontSize: 10, color: theme.textSecondary }}>swap</Text>
        </TouchableOpacity>

        {/* Dismiss button */}
        <TouchableOpacity
          style={[styles.dismissBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={hidePet}
        >
          <Text style={{ fontSize: 10, color: theme.textSecondary }}>×</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Hatch modal */}
      <HatchPetModal
        visible={showHatch}
        apiKey={openAIKey}
        onClose={() => setShowHatch(false)}
        onHatched={(pet) => { addCustomPet(pet); setShowHatch(false); }}
      />

      {/* Pet picker modal */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowPicker(false)} />
        <View style={[styles.pickerSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.pickerHeader}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Choose your pet</Text>
            <TouchableOpacity onPress={() => setShowPicker(false)}>
              <Text style={[styles.pickerClose, { color: theme.textSecondary }]}>Done</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.petGrid}>
            {/* Hatch new pet card */}
            <TouchableOpacity
              style={[styles.petCard, styles.hatchCard, { backgroundColor: theme.background, borderColor: theme.accent }]}
              onPress={() => { setShowPicker(false); setShowHatch(true); }}
            >
              <Text style={{ fontSize: 36 }}>🥚</Text>
              <Text style={[styles.petCardName, { color: theme.accent }]}>Hatch New</Text>
              <Text style={[styles.petCardDesc, { color: theme.textSecondary }]}>
                Generate a custom pet with DALL-E 3
              </Text>
            </TouchableOpacity>

            {allPets.map(pet => (
              <TouchableOpacity
                key={pet.id}
                style={[
                  styles.petCard,
                  { backgroundColor: theme.background, borderColor: pet.id === activePet.id ? pet.colors.body : theme.border },
                ]}
                onPress={() => { setActivePet(pet.id); setShowPicker(false); }}
                onLongPress={() => {
                  if (pet.isCustom) removeCustomPet(pet.id);
                }}
              >
                <PetSprite pet={pet} animation="idle" size={52} />
                <Text style={[styles.petCardName, { color: theme.text }]}>{pet.name}</Text>
                <Text style={[styles.petCardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                  {pet.description}
                </Text>
                {pet.isCustom && (
                  <Text style={[styles.customBadge, { color: theme.accent }]}>custom</Text>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingPet: {
    position: 'absolute',
    zIndex: 9999,
    alignItems: 'center',
    width: PET_SIZE,
  },
  bubble: {
    position: 'absolute',
    bottom: PET_SIZE + 8,
    right: 0,
    maxWidth: BUBBLE_MAX_W,
    minWidth: 80,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  bubbleDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  bubbleText: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  nameTag: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  nameText: {
    fontSize: 10,
    fontWeight: '600',
  },
  changeBtn: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  dismissBtn: {
    marginTop: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  pickerClose: {
    fontSize: 15,
    fontWeight: '500',
  },
  petGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 12,
  },
  petCard: {
    width: '44%',
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    gap: 6,
  },
  petCardName: {
    fontSize: 14,
    fontWeight: '700',
  },
  petCardDesc: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 15,
  },
  hatchCard: {
    borderStyle: 'dashed',
    borderWidth: 2,
  },
  customBadge: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
});
