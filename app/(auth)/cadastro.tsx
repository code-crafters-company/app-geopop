import { useMutation, useQuery } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { ArrowLeft, CheckSquare, ShieldCheck, Square } from 'phosphor-react-native';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { z } from 'zod';
import { AuthBrand } from '../../src/components/AuthBrand';
import { Button } from '../../src/components/Button';
import { Input } from '../../src/components/Input';
import { publicApi } from '../../src/services/api';

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const schema = z.object({
  nomeCompleto: z.string().trim().min(3, 'Informe seu nome completo'),
  cpfCnpj: z.string().refine((value) => [11, 14].includes(onlyDigits(value).length), 'Informe um CPF ou CNPJ válido'),
  email: z.string().trim().email('Informe um e-mail válido'),
  telefone: z.string().trim().optional(),
  senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  confirmarSenha: z.string().min(1, 'Confirme sua senha'),
  aceitouTermos: z.boolean().refine((value) => value === true, { message: 'É necessário aceitar os Termos de Uso' }),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
});

type FormData = z.infer<typeof schema>;
type Tenant = { id: string; nome: string; logoUrl?: string | null; corPrimaria?: string | null };

export default function CadastroScreen() {
  const tenantSlug = process.env.EXPO_PUBLIC_DEFAULT_TENANT ?? 'default';
  const { data: tenant, isLoading: isLoadingTenant } = useQuery({
    queryKey: ['tenant-branding', tenantSlug],
    queryFn: async () => {
      const response = await publicApi.get<{ result: Tenant }>('/tenant/by-subdomain', {
        params: { subdominio: tenantSlug },
      });
      return response.data.result;
    },
    retry: 1,
  });

  const { control, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nomeCompleto: '', cpfCnpj: '', email: '', telefone: '', senha: '', confirmarSenha: '', aceitouTermos: false },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!tenant?.id) throw new Error('Não foi possível identificar a organização. Tente novamente.');

      const response = await publicApi.post<{ isValid?: boolean; errors?: string[] }>('/usuario-app/registrar', {
        nomeCompleto: data.nomeCompleto.trim(),
        cpfCnpj: onlyDigits(data.cpfCnpj),
        email: data.email.trim().toLowerCase(),
        telefone: data.telefone?.trim() || undefined,
        senhaTemporaria: data.senha,
      });

      if (response.data.isValid === false) {
        throw new Error(response.data.errors?.[0] ?? 'Não foi possível criar a conta.');
      }
    },
    onSuccess: () => {
      Alert.alert('Conta criada', 'Seu cadastro foi concluído. Agora você já pode entrar.', [
        { text: 'Ir para o login', onPress: () => router.replace('/login') },
      ]);
    },
    onError: (error: Error) => Alert.alert('Não foi possível cadastrar', error.message),
  });

  return (
    <View testID="cadastro-screen" style={styles.screen}>
      <View style={styles.glow} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.topBar}>
              <Pressable testID="cadastro-back-btn" style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
                <ArrowLeft size={20} color="#18202D" />
              </Pressable>
              <AuthBrand
                name={tenant?.nome}
                logoUrl={tenant?.logoUrl}
                primaryColor={tenant?.corPrimaria}
              />
            </View>

            <View style={styles.intro}>
              <Text style={styles.eyebrow}>NOVA CONTA</Text>
              <Text style={styles.title}>Comece a acompanhar sua operação.</Text>
              <Text style={styles.subtitle}>Preencha seus dados para criar um acesso seguro ao GeoPop.</Text>
            </View>

            <View style={styles.form}>
              <Controller
                control={control}
                name="nomeCompleto"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Nome completo"
                    placeholder="Como devemos chamar você?"
                    autoCapitalize="words"
                    autoComplete="name"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.nomeCompleto?.message}
                    testID="cadastro-nome-input"
                  />
                )}
              />

              <Controller
                control={control}
                name="cpfCnpj"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="CPF ou CNPJ"
                    placeholder="Somente números"
                    keyboardType="number-pad"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.cpfCnpj?.message}
                    testID="cadastro-documento-input"
                  />
                )}
              />

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
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    testID="cadastro-email-input"
                  />
                )}
              />

              <Controller
                control={control}
                name="telefone"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Telefone (opcional)"
                    placeholder="(11) 90000-0000"
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.telefone?.message}
                    testID="cadastro-telefone-input"
                  />
                )}
              />

              <Controller
                control={control}
                name="senha"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Senha"
                    placeholder="Mínimo de 6 caracteres"
                    secureToggle
                    autoComplete="new-password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.senha?.message}
                    testID="cadastro-senha-input"
                  />
                )}
              />

              <Controller
                control={control}
                name="confirmarSenha"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    label="Confirmar senha"
                    placeholder="Digite a senha novamente"
                    secureToggle
                    autoComplete="new-password"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmarSenha?.message}
                    testID="cadastro-confirmar-senha-input"
                  />
                )}
              />

              <Controller
                control={control}
                name="aceitouTermos"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.termsWrap}>
                    <View style={styles.termsRow}>
                      <Pressable
                        testID="cadastro-termos-checkbox"
                        onPress={() => onChange(!value)}
                        hitSlop={8}
                      >
                        {value
                          ? <CheckSquare size={24} weight="fill" color="#E8B923" />
                          : <Square size={24} color="#9CA3AF" />}
                      </Pressable>
                      <Text style={styles.termsText}>Li e aceito os </Text>
                      <Pressable testID="cadastro-termos-link" onPress={() => router.push('/termos')} hitSlop={8}>
                        <Text style={styles.termsLink}>Termos de Uso</Text>
                      </Pressable>
                    </View>
                    {errors.aceitouTermos && (
                      <Text style={styles.termsError}>{errors.aceitouTermos.message}</Text>
                    )}
                  </View>
                )}
              />

              <Button
                label="Criar minha conta"
                onPress={handleSubmit((data) => mutation.mutate(data))}
                loading={mutation.isPending || isLoadingTenant}
                disabled={!tenant?.id}
                style={styles.submitButton}
                testID="cadastro-button"
              />

              <View style={styles.securityNote}>
                <ShieldCheck size={18} weight="fill" color="#2E8B67" />
                <Text style={styles.securityText}>Seus dados são usados apenas para proteger e identificar seu acesso.</Text>
              </View>
            </View>

            <Pressable testID="cadastro-login-link" onPress={() => router.replace('/login')} style={styles.loginLink}>
              <Text style={styles.loginText}>Já possui uma conta? <Text style={styles.loginTextStrong}>Entrar</Text></Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FA' },
  flex: { flex: 1 },
  glow: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: '#F8DF70', opacity: 0.18, top: -170, right: -90,
  },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 54, paddingBottom: 36 },
  content: { width: '100%', maxWidth: 500, alignSelf: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backButton: {
    width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: '#DDE2E9',
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  intro: { marginTop: 36, marginBottom: 24 },
  eyebrow: { color: '#9B7410', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 10 },
  title: { color: '#18202D', fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7, maxWidth: 390 },
  subtitle: { color: '#697386', fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 380 },
  form: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24,
    borderWidth: 1, borderColor: '#E6E9EE', shadowColor: '#24324A',
    shadowOpacity: 0.07, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 4,
  },
  termsWrap: { marginTop: 4, marginBottom: 4 },
  termsRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  termsText: { color: '#4B5563', fontSize: 13, lineHeight: 19, marginLeft: 6 },
  termsLink: { color: '#9B7410', fontSize: 13, lineHeight: 19, fontWeight: '800', textDecorationLine: 'underline' },
  termsError: { color: '#EF4444', fontSize: 12, marginTop: 6, marginLeft: 34 },
  submitButton: { marginTop: 8, backgroundColor: '#E8B923', borderRadius: 14, height: 54 },
  securityNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 16, paddingHorizontal: 4 },
  securityText: { flex: 1, color: '#7A8494', fontSize: 11, lineHeight: 16 },
  loginLink: { alignItems: 'center', paddingVertical: 22 },
  loginText: { color: '#697386', fontSize: 13 },
  loginTextStrong: { color: '#18202D', fontWeight: '800' },
});
