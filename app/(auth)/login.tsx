import React from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/services/api';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { colors, spacing } from '../../src/components/theme';
import type { LoginResult } from '../../src/types';

const schema = z.object({
  email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
});
type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const tenantSlug = process.env.EXPO_PUBLIC_DEFAULT_TENANT ?? 'default';
  const { data: tenant } = useQuery({
    queryKey: ['tenant-branding', tenantSlug],
    queryFn: async () => {
      const response = await api.get<{ result: { nome: string; logoUrl?: string | null; corPrimaria?: string | null } }>('/tenant/by-subdomain', { params: { subdominio: tenantSlug } });
      return response.data.result;
    },
    retry: 1,
  });

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      // A API retorna os campos do login na raiz do JSON (não dentro de "result")
      const res = await api.post<LoginResult & { isValid: boolean; errors: string[] }>(
        '/auth/login',
        { email: data.email, senha: data.senha }
      );
      if (!res.data.isValid) throw new Error(res.data.errors?.[0] ?? 'Credenciais inválidas');
      return res.data;
    },
    onSuccess: async (data) => {
      await signIn(data);
    },
    onError: (err: Error) => {
      Alert.alert('Erro', err.message || 'Não foi possível fazer login.');
    },
  });

  return (
    <LinearGradient colors={['#0A0A0A', '#111111']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoWrap}>
            {tenant?.logoUrl ? <Image source={{ uri: tenant.logoUrl }} style={styles.logoImage} resizeMode="contain" /> : <View style={styles.logoBg}>
              <Text style={styles.logoText}>GEO</Text>
              <Text style={[styles.logoText, { color: tenant?.corPrimaria ?? colors.primary }]}>POP</Text>
            </View>}
            <Text style={styles.tagline}>{tenant?.nome ?? 'GeoPop'} · Rastreamento Inteligente</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.title}>Entrar</Text>
            <Text style={styles.subtitle}>Acesse sua conta para continuar</Text>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="E-mail"
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.email?.message}
                  testID="email-input"
                />
              )}
            />

            <Controller
              control={control}
              name="senha"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Senha"
                  placeholder="••••••••"
                  secureToggle
                  onChangeText={onChange}
                  onBlur={onBlur}
                  value={value}
                  error={errors.senha?.message}
                  testID="senha-input"
                />
              )}
            />

            <Button
              label="Entrar"
              onPress={handleSubmit((d) => mutation.mutate(d))}
              loading={mutation.isPending}
              style={{ marginTop: spacing.sm }}
              testID="login-button"
            />
          </View>

          <Text style={styles.version}>GeoPop Mobile v1.0</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  logoWrap: { alignItems: 'center', marginBottom: 48 },
  logoBg: {
    flexDirection: 'row',
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  logoText: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 2 },
  logoImage: { width: 240, height: 76, marginBottom: 12 },
  tagline: { color: '#D1D5DB', fontSize: 13 },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginBottom: spacing.xxl,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginBottom: spacing.xl },
  version: { color: '#9CA3AF', fontSize: 11, textAlign: 'center' },
});
