import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  FlameMilestoneTier,
  FROZEN_FLAME_TIER,
  getFlameTier,
} from '@/domain/attendanceStreak';

export type StreakFireEffectProps = {
  streakWeeks?: number;
  tier?: FlameMilestoneTier;
  isFrozen?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'hero';
  animated?: boolean;
  style?: ViewStyle;
};

const SIZE_CONFIGS = {
  xs: {
    iconSize: 18,
    containerSize: 26,
    innerIconSize: 10,
    glowSize: 32,
    badgeSize: 10,
  },
  sm: {
    iconSize: 24,
    containerSize: 34,
    innerIconSize: 14,
    glowSize: 42,
    badgeSize: 12,
  },
  md: {
    iconSize: 36,
    containerSize: 50,
    innerIconSize: 20,
    glowSize: 64,
    badgeSize: 16,
  },
  lg: {
    iconSize: 52,
    containerSize: 72,
    innerIconSize: 30,
    glowSize: 92,
    badgeSize: 22,
  },
  hero: {
    iconSize: 76,
    containerSize: 106,
    innerIconSize: 44,
    glowSize: 136,
    badgeSize: 30,
  },
};

export function StreakFireEffect({
  streakWeeks = 0,
  tier: propTier,
  isFrozen = false,
  size = 'md',
  animated = true,
  style,
}: StreakFireEffectProps) {
  const currentTier = isFrozen
    ? (FROZEN_FLAME_TIER as FlameMilestoneTier)
    : propTier ?? getFlameTier(streakWeeks);

  const cfg = SIZE_CONFIGS[size];

  // Animated values for pulsing flame flicker and glow
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flickerAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;

    // Gentle breathing scale for flame heat
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.96,
          duration: 800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    // Subtle flicker in opacity
    const flickerLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(flickerAnim, {
          toValue: 0.85,
          duration: 450,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(flickerAnim, {
          toValue: 1.0,
          duration: 550,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    );

    // Very gentle rotation sway for fire tongues
    const rotateLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: -1,
          duration: 1200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();
    flickerLoop.start();
    rotateLoop.start();

    return () => {
      pulseLoop.stop();
      flickerLoop.stop();
      rotateLoop.stop();
    };
  }, [animated, pulseAnim, flickerAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-4deg', '0deg', '4deg'],
  });

  return (
    <View
      style={[
        styles.root,
        {
          width: cfg.containerSize,
          height: cfg.containerSize,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={
        isFrozen
          ? 'Streak is on hold and frozen'
          : `${currentTier.tierName} flame: ${streakWeeks} week streak milestone`
      }
    >
      {/* Outer Atmospheric Aura Glow */}
      <Animated.View
        style={[
          styles.glowCircle,
          {
            width: cfg.glowSize,
            height: cfg.glowSize,
            borderRadius: cfg.glowSize / 2,
            backgroundColor: currentTier.haloColor,
            transform: [{ scale: pulseAnim }],
            opacity: flickerAnim,
          },
        ]}
      />

      {/* Flame / Shield Glyphs */}
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: pulseAnim },
              { rotate: isFrozen ? '0deg' : spin },
            ],
          },
        ]}
      >
        {isFrozen ? (
          // Frozen Protected Shield
          <View style={styles.glyphCenter}>
            <Ionicons
              name="shield-checkmark"
              size={cfg.iconSize}
              color={currentTier.fireColor}
            />
            <Ionicons
              name="snow-outline"
              size={cfg.innerIconSize}
              color={currentTier.coreColor}
              style={styles.innerFrost}
            />
          </View>
        ) : (
          // Dynamic Fire Flame (Layered Core + Outer Tongue)
          <View style={styles.glyphCenter}>
            {/* Outer Flame in Milestone Tier Fire Color */}
            <Ionicons
              name="flame"
              size={cfg.iconSize}
              color={currentTier.fireColor}
            />

            {/* Inner Hot Fire Core */}
            <Ionicons
              name="flame"
              size={cfg.innerIconSize}
              color={currentTier.coreColor}
              style={[
                styles.innerCore,
                {
                  bottom: cfg.iconSize * 0.12,
                },
              ]}
            />

            {/* Century 100+ Crown Star / Sparkle */}
            {currentTier.threshold >= 100 ? (
              <Ionicons
                name="star"
                size={cfg.badgeSize}
                color="#FEF08A"
                style={[
                  styles.centuryStar,
                  {
                    top: -cfg.badgeSize * 0.4,
                  },
                ]}
              />
            ) : null}
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    alignSelf: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyphCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  innerCore: {
    position: 'absolute',
    alignSelf: 'center',
    opacity: 0.92,
  },
  innerFrost: {
    position: 'absolute',
    alignSelf: 'center',
  },
  centuryStar: {
    position: 'absolute',
    alignSelf: 'center',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 3,
  },
});
