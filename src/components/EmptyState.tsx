import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WarningCircle } from 'phosphor-react-native';
import { colors, spacing } from './theme';

interface Props {
  title?: string;
  message?: string;
}

export function EmptyState({ title = 'Nenhum registro', message }: Props) {
  return (
    <View style={styles.container}>
      <WarningCircle size={48} color={colors.textMuted} weight="thin" />
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.msg}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  title: { color: colors.textSecondary, fontSize: 16, fontWeight: '600', marginTop: spacing.md },
  msg: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
});
