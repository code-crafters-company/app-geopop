import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radius, spacing } from './theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  style?: ViewStyle;
  testID?: string;
}

export function Button({ label, onPress, loading, disabled, variant = 'primary', style, testID }: Props) {
  const bg = variant === 'primary' ? colors.primary
    : variant === 'danger' ? colors.error
    : 'transparent';
  const borderColor = variant === 'outline' ? colors.primary : 'transparent';
  const textColor = variant === 'ghost' ? colors.textSecondary
    : variant === 'outline' ? colors.primary
    : variant === 'danger' ? '#fff'
    : '#111111';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, borderColor, opacity: pressed || disabled ? 0.6 : 1 },
        variant === 'outline' && { borderWidth: 1.5 },
        style,
      ]}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      }
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  label: { fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
});
