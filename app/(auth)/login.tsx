import React from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowRight, CheckCircle } from 'phosphor-react-native';
import { useAuthStore } from '../../src/stores/auth';
import { api } from '../../src/services/api';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { AuthBrand } from '../../src/components/AuthBrand';
import { spacing } from '../../src/components/theme';
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
      const response = await api.get<{ result: { id: string; nome: string; logoUrl?: string | null; corPrimaria?: string | null } }>('/tenant/by-subdomain', { params: { subdominio: tenantSlug } });
      return response.data.result;
    },
    retry: 1,
  });

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', senha: '' },
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
    <LinearGradient colors={['#FFFDF7', '#F4F7FB']} style={styles.gradient}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <AuthBrand
              name={tenant?.nome}
              logoUrl={tenant?.logoUrl}
              primaryColor={tenant?.corPrimaria}
            />

            <View style={styles.intro}>
              <Text style={styles.eyebrow}>RASTREAMENTO INTELIGENTE</Text>
              <Text style={styles.title}>Sua operação, sempre por perto.</Text>
              <Text style={styles.subtitle}>Entre para acompanhar veículos, rotas e alertas em tempo real.</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.formHeading}>
                <Text style={styles.formTitle}>Acesse sua conta</Text>
                <Text style={styles.formHint}>Use os dados cadastrados na plataforma.</Text>
              </View>

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="E-mail"
                    placeholder="nome@empresa.com.br"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
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
                    placeholder="Digite sua senha"
                    secureToggle
                    autoComplete="current-password"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    value={value}
                    error={errors.senha?.message}
                    testID="senha-input"
                  />
                )}
              />

              <Button
                label="Entrar na plataforma"
                onPress={handleSubmit((d) => mutation.mutate(d))}
                loading={mutation.isPending}
                style={styles.submitButton}
                testID="login-button"
              />

              <View style={styles.secureRow}>
                <CheckCircle size={16} weight="fill" color="#2E8B67" />
                <Text style={styles.secureText}>Acesso seguro e dados protegidos</Text>
              </View>
            </View>

            <Pressable testID="open-cadastro-btn" style={styles.signup} onPress={() => router.push('/cadastro')}>
              <View>
                <Text style={styles.signupLabel}>Primeiro acesso?</Text>
                <Text style={styles.signupTitle}>Crie sua conta GeoPop</Text>
              </View>
              <View style={styles.signupArrow}>
                <ArrowRight size={20} color="#18202D" />
              </View>
            </Pressable>

            <Text style={styles.version}>GeoPop Mobile · v1.0</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: 58, paddingBottom: 28 },
  content: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  glowTop: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: '#F8DF70', opacity: 0.2, top: -120, right: -100,
  },
  glowBottom: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    backgroundColor: '#BED8FF', opacity: 0.16, bottom: -130, left: -90,
  },
  intro: { marginTop: 42, marginBottom: 26 },
  eyebrow: { color: '#9B7410', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  title: { color: '#18202D', fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8, maxWidth: 340 },
  subtitle: { color: '#697386', fontSize: 15, lineHeight: 22, marginTop: 10, maxWidth: 360 },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: '#E6E9EE',
    shadowColor: '#24324A',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  formHeading: { marginBottom: 20 },
  formTitle: { color: '#18202D', fontSize: 19, fontWeight: '800' },
  formHint: { color: '#7A8494', fontSize: 12, marginTop: 5 },
  submitButton: { marginTop: spacing.sm, backgroundColor: '#E8B923', borderRadius: 14, height: 54 },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
  secureText: { color: '#7A8494', fontSize: 11, fontWeight: '500' },
  signup: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 16, paddingVertical: 15, paddingHorizontal: 18,
    borderWidth: 1, borderColor: '#DDE2E9', borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.66)',
  },
  signupLabel: { color: '#7A8494', fontSize: 11, fontWeight: '600' },
  signupTitle: { color: '#18202D', fontSize: 14, fontWeight: '800', marginTop: 2 },
  signupArrow: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F5D75F', alignItems: 'center', justifyContent: 'center' },
  version: { color: '#99A1AF', fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 22 },
});
