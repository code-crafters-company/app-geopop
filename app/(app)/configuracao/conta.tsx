import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowSquareIn, ArrowSquareOut, BellRinging, Buildings, Clock,
  IdentificationBadge, Lightning, LightningSlash, Speedometer, SignOut,
  Terminal, User, UserSwitch, WifiHigh, WifiSlash,
} from 'phosphor-react-native';
import { useAuthStore } from '../../../src/stores/auth';
import { useTrackingStore } from '../../../src/stores/tracking';
import { useQueryClient } from '@tanstack/react-query';
import { useAlterarSenha } from '../../../src/hooks/useUsuarioApp';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { colors, spacing, radius } from '../../../src/components/theme';
import { formatDateTime } from '../../../src/utils/format';

const senhaSchema = z.object({
  novaSenha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmarSenha: z.string().min(1, 'Confirme a nova senha'),
}).refine((data) => data.novaSenha === data.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
});
type SenhaForm = z.infer<typeof senhaSchema>;

const NOTIFICACAO_TIPOS = [
  { key: 'ignicaoLigada', label: 'Ignição Ligada', Icon: Lightning },
  { key: 'ignicaoDesligada', label: 'Ignição Desligada', Icon: LightningSlash },
  { key: 'entradaCerca', label: 'Entrada de Cerca', Icon: ArrowSquareIn },
  { key: 'saidaCerca', label: 'Saída de Cerca', Icon: ArrowSquareOut },
  { key: 'resultadoComando', label: 'Resultado de Comando', Icon: Terminal },
  { key: 'trocaCondutor', label: 'Troca de Condutor', Icon: UserSwitch },
  { key: 'excessoVelocidade', label: 'Excesso de Velocidade', Icon: Speedometer },
  { key: 'alarme', label: 'Alarme', Icon: BellRinging },
] as const;

export default function ContaScreen() {
  const { user, signOut } = useAuthStore();
  const clearVehicles = useTrackingStore((state) => state.clear);
  const connected = useTrackingStore((state) => state.connected);
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const alterarSenha = useAlterarSenha();

  const [notificacoesPref, setNotificacoesPref] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NOTIFICACAO_TIPOS.map((tipo) => [tipo.key, true])),
  );

  const { control, handleSubmit, reset, formState: { errors } } = useForm<SenhaForm>({
    resolver: zodResolver(senhaSchema),
    defaultValues: { novaSenha: '', confirmarSenha: '' },
  });

  const handleSignOut = () => {
    Alert.alert('Sair da conta', 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => { queryClient.clear(); clearVehicles(); await signOut(); } },
    ]);
  };

  const onAlterarSenha = (data: SenhaForm) => {
    if (!user) return;
    alterarSenha.mutate({ id: user.usuarioId, novaSenha: data.novaSenha }, {
      onSuccess: () => { reset(); Alert.alert('Senha alterada', 'Sua senha foi atualizada com sucesso.'); },
      onError: () => Alert.alert('Erro', 'Não foi possível alterar a senha. Tente novamente.'),
    });
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

      {/* Informações do Perfil */}
      <Text style={styles.sectionTitle}>Informações do Perfil</Text>
      <Card style={styles.card}>
        <View style={styles.infoRow}>
          <User size={18} color={colors.primary} />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Nome</Text>
            <Text style={styles.infoValue}>{user.nomeCompleto}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <IdentificationBadge size={18} color={colors.primary} />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Função</Text>
            <Text style={styles.infoValue}>{user.isAppUser ? 'Usuário' : 'Administrador'}</Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <Buildings size={18} color={colors.primary} />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Tenant</Text>
            <Text style={styles.infoValue}>{user.subdominio ?? '—'}</Text>
          </View>
        </View>
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Clock size={18} color={colors.primary} />
          <View style={styles.infoText}>
            <Text style={styles.infoLabel}>Último Login</Text>
            <Text style={styles.infoValue}>{user.ultimoLogin ? formatDateTime(user.ultimoLogin) : '—'}</Text>
          </View>
        </View>
      </Card>

      {/* Conexão em Tempo Real */}
      <Text style={styles.sectionTitle}>Conexão em Tempo Real</Text>
      <Card style={[styles.card, styles.connectionCard]} testID="realtime-connection-card">
        {connected ? <WifiHigh size={20} color={colors.success} /> : <WifiSlash size={20} color={colors.textMuted} />}
        <View style={styles.infoText}>
          <Text style={styles.infoValue}>{connected ? 'Conectado' : 'Desconectado'}</Text>
          <Text style={styles.infoLabel}>Status da conexão para atualizações em tempo real</Text>
        </View>
      </Card>

      {/* Alterar Senha */}
      <Text style={styles.sectionTitle}>Alterar Senha</Text>
      <Card style={styles.card}>
        <Controller
          control={control}
          name="novaSenha"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Nova Senha"
              placeholder="Digite a nova senha"
              secureToggle
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.novaSenha?.message}
              testID="nova-senha-input"
            />
          )}
        />
        <Controller
          control={control}
          name="confirmarSenha"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirmar Nova Senha"
              placeholder="Confirme a nova senha"
              secureToggle
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.confirmarSenha?.message}
              testID="confirmar-senha-input"
            />
          )}
        />
        <Button
          label="Alterar Senha"
          onPress={handleSubmit(onAlterarSenha)}
          loading={alterarSenha.isPending}
          testID="alterar-senha-btn"
        />
      </Card>

      {/* Notificações */}
      <Text style={styles.sectionTitle}>Notificações</Text>
      <Text style={styles.sectionHint}>Gerencie os tipos de notificações que você deseja receber</Text>
      <Card style={styles.card}>
        {NOTIFICACAO_TIPOS.map((tipo, index) => (
          <View key={tipo.key} style={[styles.notifRow, index === NOTIFICACAO_TIPOS.length - 1 && { borderBottomWidth: 0 }]}>
            <tipo.Icon size={18} color={colors.textSecondary} />
            <Text style={styles.notifLabel}>{tipo.label}</Text>
            <Switch
              testID={`notif-pref-${tipo.key}`}
              value={notificacoesPref[tipo.key]}
              onValueChange={(value) => setNotificacoesPref((prev) => ({ ...prev, [tipo.key]: value }))}
              trackColor={{ false: colors.inactive, true: colors.primary }}
              thumbColor="#fff"
            />
          </View>
        ))}
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
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: spacing.sm },
  sectionHint: { color: colors.textMuted, fontSize: 12, marginTop: -spacing.xs, marginBottom: spacing.sm },
  card: { marginBottom: spacing.lg },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  infoText: { flex: 1 },
  infoLabel: { color: colors.textMuted, fontSize: 12 },
  infoValue: { color: colors.text, fontSize: 15, fontWeight: '500', marginTop: 2 },
  connectionCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  notifRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  notifLabel: { flex: 1, color: colors.text, fontSize: 13, fontWeight: '500' },
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
