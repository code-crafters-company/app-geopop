import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from './theme';

interface Props {
  label: string;
  color?: string;
  bg?: string;
}

export function Badge({ label, color = colors.text, bg = colors.primary }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: bg + '22' }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});
