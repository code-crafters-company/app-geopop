import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SignOut, User, Buildings } from 'phosphor-react-native';
import { useAuthStore } from '../../../src/stores/auth';
import { useTrackingStore } from '../../../src/stores/tracking';
import { useQueryClient } from '@tanstack/react-query';
import { Card } from '../../../src/components/Card';
import { colors, spacing, radius } from '../../../src/components/theme';

export default function ContaScreen() {
  const { user, signOut } = useAuthStore();
  const clearVehicles = useTrackingStore((state) => state.clear);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const handleSignOut = () => {
    Alert.alert('Sair', 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { queryClient.clear(); clearVehicles(); await signOut(); } },
    ]);
  };

  if (!user) return null;

  const initials = user.nomeCompleto
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <ScrollView
      testID="account-screen"
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user.nomeCompleto}</Text>
        <Text style={styles.email}>{user.email}</Text>
        {user.isAppUser && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Usuário App</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <Card style={styles.card}>
        <View style={styles.infoRow}>
          <User size={18} color={colors.primary} />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Nome</Text>
            <Text style={styles.infoValue}>{user.nomeCompleto}</Text>
          </View>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Buildings size={18} color={colors.primary} />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Tenant</Text>
            <Text style={styles.infoValue}>{user.subdominio ?? '—'}</Text>
          </View>
        </View>
      </Card>

      {/* Sign out */}
      <Pressable style={styles.signOutBtn} onPress={handleSignOut} testID="signout-btn">
        <SignOut size={20} color={colors.error} />
        <Text style={styles.signOutText}>Sair da Conta</Text>
      </Pressable>

      <Text style={styles.version}>GeoPop Mobile v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  avatarSection: { alignItems: 'center', marginBottom: spacing.xxl },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  name: { color: colors.text, fontSize: 20, fontWeight: '700' },
  email: { color: colors.textSecondary, fontSize: 14, marginTop: 4 },
  badge: {
    backgroundColor: colors.primary + '18', borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 4, marginTop: 8,
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  badgeText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  card: { marginBottom: spacing.lg },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  infoText: { flex: 1 },
  infoLabel: { color: colors.textMuted, fontSize: 12 },
  infoValue: { color: colors.text, fontSize: 15, fontWeight: '500', marginTop: 2 },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.md, backgroundColor: colors.error + '18',
    borderRadius: radius.lg, padding: spacing.lg,
    borderWidth: 1, borderColor: colors.error + '40',
    marginBottom: spacing.xxl,
  },
  signOutText: { color: colors.error, fontSize: 16, fontWeight: '700' },
  version: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
