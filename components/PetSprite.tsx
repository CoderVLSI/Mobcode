import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system';
import { Pet, PetAnimation } from '../data/pets';

interface PetSpriteProps {
  pet: Pet;
  animation: PetAnimation;
  size?: number;
}

// Pixel art pet rendered via React Native shapes + Animated
// When pet.spritesheetPath is set, renders the correct 192x208 cell from the 8x9 atlas instead
export function PetSprite({ pet, animation, size = 64 }: PetSpriteProps) {
  const bounceY = useRef(new Animated.Value(0)).current;
  const scaleX = useRef(new Animated.Value(1)).current;
  const scaleY = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const eyeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Stop all running animations first
    bounceY.stopAnimation();
    scaleX.stopAnimation();
    scaleY.stopAnimation();
    rotate.stopAnimation();
    opacity.stopAnimation();
    eyeScale.stopAnimation();

    // Reset to base
    Animated.parallel([
      Animated.spring(bounceY, { toValue: 0, useNativeDriver: true, tension: 80 }),
      Animated.spring(scaleX, { toValue: 1, useNativeDriver: true, tension: 80 }),
      Animated.spring(scaleY, { toValue: 1, useNativeDriver: true, tension: 80 }),
      Animated.spring(rotate, { toValue: 0, useNativeDriver: true, tension: 80 }),
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80 }),
    ]).start(() => playAnimation(animation));
  }, [animation]);

  const playAnimation = (anim: PetAnimation) => {
    switch (anim) {
      case 'idle':
        // Gentle breathing pulse
        Animated.loop(
          Animated.sequence([
            Animated.timing(scaleY, { toValue: 1.06, duration: 900, useNativeDriver: true }),
            Animated.timing(scaleY, { toValue: 0.97, duration: 900, useNativeDriver: true }),
          ])
        ).start();
        break;

      case 'running':
        // Quick horizontal bounce + slight squish
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(bounceY, { toValue: -size * 0.18, duration: 180, useNativeDriver: true }),
              Animated.timing(scaleX, { toValue: 0.88, duration: 180, useNativeDriver: true }),
              Animated.timing(scaleY, { toValue: 1.12, duration: 180, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(bounceY, { toValue: 0, duration: 180, useNativeDriver: true }),
              Animated.timing(scaleX, { toValue: 1.12, duration: 180, useNativeDriver: true }),
              Animated.timing(scaleY, { toValue: 0.88, duration: 180, useNativeDriver: true }),
            ]),
          ])
        ).start();
        break;

      case 'waiting':
        // Slow side-to-side rock + eye blink
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotate, { toValue: -0.08, duration: 600, useNativeDriver: true }),
            Animated.timing(rotate, { toValue: 0.08, duration: 600, useNativeDriver: true }),
          ])
        ).start();
        Animated.loop(
          Animated.sequence([
            Animated.delay(1800),
            Animated.timing(eyeScale, { toValue: 0.1, duration: 80, useNativeDriver: true }),
            Animated.timing(eyeScale, { toValue: 1, duration: 80, useNativeDriver: true }),
          ])
        ).start();
        break;

      case 'review':
        // Eyes scan left-right (simulate via rotate)
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotate, { toValue: -0.05, duration: 400, useNativeDriver: true }),
            Animated.delay(200),
            Animated.timing(rotate, { toValue: 0.05, duration: 400, useNativeDriver: true }),
            Animated.delay(200),
          ])
        ).start();
        break;

      case 'failed':
        // Droop down + sad wobble
        Animated.timing(bounceY, { toValue: size * 0.1, duration: 300, useNativeDriver: true }).start();
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotate, { toValue: -0.12, duration: 400, useNativeDriver: true }),
            Animated.timing(rotate, { toValue: 0.12, duration: 400, useNativeDriver: true }),
          ])
        ).start();
        break;

      case 'waving':
        // Fast wave oscillation
        Animated.loop(
          Animated.sequence([
            Animated.timing(rotate, { toValue: 0.25, duration: 200, useNativeDriver: true }),
            Animated.timing(rotate, { toValue: -0.1, duration: 200, useNativeDriver: true }),
          ])
        ).start();
        break;

      case 'jumping':
      case 'completed':
        // Celebration: big jumps
        Animated.loop(
          Animated.sequence([
            Animated.parallel([
              Animated.timing(bounceY, { toValue: -size * 0.45, duration: 250, useNativeDriver: true }),
              Animated.timing(scaleX, { toValue: 0.85, duration: 250, useNativeDriver: true }),
              Animated.timing(scaleY, { toValue: 1.15, duration: 250, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.timing(bounceY, { toValue: 0, duration: 250, useNativeDriver: true }),
              Animated.timing(scaleX, { toValue: 1.15, duration: 120, useNativeDriver: true }),
              Animated.timing(scaleY, { toValue: 0.85, duration: 120, useNativeDriver: true }),
            ]),
            Animated.parallel([
              Animated.spring(scaleX, { toValue: 1, useNativeDriver: true }),
              Animated.spring(scaleY, { toValue: 1, useNativeDriver: true }),
            ]),
            Animated.delay(300),
          ])
        ).start();
        break;
    }
  };

  const rotateStr = rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-57.3deg', '57.3deg'] });
  const s = size;

  // SVG pet (Gemini text-generated)
  if (pet.isSvg && pet.animationImages) {
    const svgPath = pet.animationImages[animation] ?? pet.animationImages['idle'];
    return (
      <Animated.View style={[
        { width: s, height: s },
        { transform: [{ translateY: bounceY }, { scaleX }, { scaleY }, { rotate: rotateStr }] },
      ]}>
        <SvgPet path={svgPath} size={s} />
      </Animated.View>
    );
  }

  // PNG pet (gpt-image-2 generated)
  if (pet.animationImages) {
    const imgUri = pet.animationImages[animation] ?? pet.animationImages['idle'];
    return (
      <Animated.View style={[
        { width: s, height: s },
        { transform: [{ translateY: bounceY }, { scaleX }, { scaleY }, { rotate: rotateStr }] },
      ]}>
        <Image
          source={{ uri: `file://${imgUri}` }}
          style={{ width: s, height: s, borderRadius: s * 0.1 }}
          resizeMode="contain"
        />
      </Animated.View>
    );
  }

  // If the pet has a custom spritesheet, render from atlas
  if (pet.spritesheetPath) {
    return (
      <SpritesheetPet
        pet={pet}
        animation={animation}
        size={size}
        bounceY={bounceY}
        scaleX={scaleX}
        scaleY={scaleY}
        rotate={rotateStr}
      />
    );
  }

  // Built-in vector pet
  const eyeH = s * 0.13;
  const { body, accent, eye, shine } = pet.colors;

  return (
    <Animated.View style={[
      styles.root,
      { width: s, height: s },
      { transform: [{ translateY: bounceY }, { scaleX }, { scaleY }, { rotate: rotateStr }] },
    ]}>
      {/* Body */}
      <View style={[styles.body, {
        width: s * 0.72,
        height: s * 0.68,
        borderRadius: s * 0.18,
        backgroundColor: body,
        borderColor: accent,
        borderWidth: 2,
        top: s * 0.22,
        left: s * 0.14,
      }]} />

      {/* Head */}
      <View style={[styles.head, {
        width: s * 0.6,
        height: s * 0.52,
        borderRadius: s * 0.14,
        backgroundColor: body,
        borderColor: accent,
        borderWidth: 2,
        top: 0,
        left: s * 0.2,
      }]}>
        {/* Shine highlight */}
        <View style={{
          position: 'absolute',
          width: s * 0.12,
          height: s * 0.08,
          borderRadius: s * 0.04,
          backgroundColor: shine,
          top: s * 0.06,
          left: s * 0.08,
          opacity: 0.6,
        }} />

        {/* Eyes */}
        <Animated.View style={[styles.eyeRow, { top: s * 0.17, paddingHorizontal: s * 0.06 }]}>
          <Animated.View style={[styles.eye, {
            width: s * 0.13,
            height: eyeH,
            borderRadius: s * 0.065,
            backgroundColor: eye,
            transform: [{ scaleY: eyeScale }],
          }]} />
          <Animated.View style={[styles.eye, {
            width: s * 0.13,
            height: eyeH,
            borderRadius: s * 0.065,
            backgroundColor: eye,
            transform: [{ scaleY: eyeScale }],
          }]} />
        </Animated.View>

        {/* Mouth — changes with failed state */}
        <View style={{
          position: 'absolute',
          width: s * 0.22,
          height: s * 0.06,
          borderRadius: s * 0.03,
          backgroundColor: animation === 'failed' ? accent : eye,
          bottom: s * 0.08,
          left: s * 0.19,
          opacity: 0.85,
        }} />
      </View>

      {/* Left leg */}
      <View style={[styles.leg, {
        width: s * 0.16,
        height: s * 0.22,
        borderRadius: s * 0.08,
        backgroundColor: accent,
        bottom: 0,
        left: s * 0.18,
      }]} />
      {/* Right leg */}
      <View style={[styles.leg, {
        width: s * 0.16,
        height: s * 0.22,
        borderRadius: s * 0.08,
        backgroundColor: accent,
        bottom: 0,
        right: s * 0.18,
      }]} />
    </Animated.View>
  );
}

// Renders a frame from a real 1536x1872 WebP spritesheet (8 cols x 9 rows, 192x208 cells)
const ATLAS_COLS = 8;
const CELL_W = 192;
const CELL_H = 208;

const ANIMATION_ROW: Record<PetAnimation, number> = {
  idle: 0,
  running: 7,
  'waving': 3,
  jumping: 4,
  failed: 5,
  waiting: 6,
  review: 8,
  completed: 4,
};

function SpritesheetPet({ pet, animation, size, bounceY, scaleX, scaleY, rotate }: any) {
  const frameRef = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const row = ANIMATION_ROW[animation] ?? 0;
    const frameCounts: Record<number, number> = { 0: 6, 3: 4, 4: 5, 5: 8, 6: 6, 7: 6, 8: 6 };
    const frames = frameCounts[row] ?? 6;
    Animated.loop(
      Animated.sequence(
        Array.from({ length: frames }, (_, i) =>
          Animated.timing(frameRef, { toValue: i, duration: 120, useNativeDriver: false })
        )
      )
    ).start();
  }, [animation]);

  const scale = size / CELL_W;
  const row = ANIMATION_ROW[animation] ?? 0;
  const translateX = frameRef.interpolate({
    inputRange: Array.from({ length: ATLAS_COLS }, (_, i) => i),
    outputRange: Array.from({ length: ATLAS_COLS }, (_, i) => -i * CELL_W * scale),
  });
  const translateY = -row * CELL_H * scale;

  return (
    <Animated.View style={{
      width: size,
      height: size * (CELL_H / CELL_W),
      overflow: 'hidden',
      transform: [{ translateY: bounceY }, { scaleX }, { scaleY }, { rotate }],
    }}>
      <Animated.Image
        source={{ uri: pet.spritesheetPath }}
        style={{
          width: CELL_W * ATLAS_COLS * scale,
          height: CELL_H * 9 * scale,
          transform: [{ translateX }, { translateY }],
        }}
        resizeMode="cover"
      />
    </Animated.View>
  );
}

// Renders an SVG file generated by Gemini text model
function SvgPet({ path, size }: { path: string; size: number }) {
  const [svgContent, setSvgContent] = useState<string | null>(null);

  useEffect(() => {
    FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.UTF8 })
      .then(setSvgContent)
      .catch(() => setSvgContent(null));
  }, [path]);

  if (!svgContent) return <View style={{ width: size, height: size }} />;

  const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{margin:0;padding:0;background:transparent}html,body{width:${size}px;height:${size}px;overflow:hidden;display:flex;align-items:center;justify-content:center}</style></head><body>${svgContent}</body></html>`;

  return (
    <WebView
      source={{ html }}
      style={{ width: size, height: size, backgroundColor: 'transparent' }}
      scrollEnabled={false}
      pointerEvents="none"
      androidLayerType="hardware"
    />
  );
}

const styles = StyleSheet.create({
  root: { position: 'relative' },
  body: { position: 'absolute' },
  head: { position: 'absolute', overflow: 'hidden' },
  eyeRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  eye: {},
  leg: { position: 'absolute' },
});
