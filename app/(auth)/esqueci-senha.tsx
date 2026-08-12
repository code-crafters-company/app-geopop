import React, { useState } from 'react';
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, EnvelopeSimple } from 'phosphor-react-native';
import { api } from '../../src/services/api';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { AuthBrand } from '../../src/components/AuthBrand';
import { spacing } from '../../src/components/theme';

const schema = z.object({ email: z.string().min(1, 'E-mail obrigatório').email('E-mail inválido') });
type FormData = z.infer<typeof schema>;

// Doc App item 5: "Esqueci minha senha". Dispara o e-mail de recuperação (a API
// responde sempre 200 — não revela se o e-mail existe) e mostra a confirmação.
export default function EsqueciSenhaScreen() {
  const [enviado, setEnviado] = useState(false);
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/auth/esqueci-senha', { email: data.email }),
    onSettled: () => setEnviado(true), // mesmo em erro de rede, mostra a confirmação genérica
  });

  return (
    <LinearGradient colors={['#FFFDF7', '#F4F7FB']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <Pressable testID="voltar-login-top" style={styles.back} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#18202D" />
              <Text style={styles.backText}>Voltar</Text>
            </Pressable>

            <AuthBrand />

            <View style={styles.form}>
              {enviado ? (
                <View style={styles.doneWrap}>
                  <View style={styles.doneIcon}><EnvelopeSimple size={26} color="#2E8B67" weight="fill" /></View>
                  <Text style={styles.formTitle}>Verifique seu e-mail</Text>
                  <Text style={styles.formHint}>
                    Se o e-mail existir, enviamos as instruções para redefinir sua senha. O link vale por 1 hora.
                  </Text>
                  <Button label="Voltar ao login" onPress={() => router.replace('/(auth)/login')} style={styles.submitButton} testID="voltar-login-btn" />
                </View>
              ) : (
                <>
                  <View style={styles.formHeading}>
                    <Text style={styles.formTitle}>Recuperar senha</Text>
                    <Text style={styles.formHint}>Informe seu e-mail e enviaremos um link para redefinir sua senha.</Text>
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
                        testID="email-recuperacao-input"
                      />
                    )}
                  />
                  <Button
                    label="Enviar link"
                    onPress={handleSubmit((d) => mutation.mutate(d))}
                    loading={mutation.isPending}
                    style={styles.submitButton}
                    testID="enviar-link-btn"
                  />
                </>
              )}
            </View>
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
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20 },
  backText: { color: '#18202D', fontSize: 14, fontWeight: '700' },
  form: {
    marginTop: 26, backgroundColor: '#FFFFFF', borderRadius: 24, padding: spacing.xl,
    borderWidth: 1, borderColor: '#E6E9EE', shadowColor: '#24324A', shadowOpacity: 0.08,
    shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 4,
  },
  formHeading: { marginBottom: 20 },
  formTitle: { color: '#18202D', fontSize: 19, fontWeight: '800', textAlign: 'center' },
  formHint: { color: '#7A8494', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 19 },
  submitButton: { marginTop: spacing.md, backgroundColor: '#E8B923', borderRadius: 14, height: 54 },
  doneWrap: { alignItems: 'center', gap: 6 },
  doneIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#DCFCE7',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
});
