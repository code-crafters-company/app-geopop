import { router } from 'expo-router';
import { ArrowLeft } from 'phosphor-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SECOES = [
  {
    titulo: '1. Aceitação dos Termos',
    texto:
      'Ao criar uma conta e utilizar o aplicativo GeoPop, você declara ter lido, compreendido e concordado integralmente com estes Termos de Uso. Caso não concorde, não conclua o cadastro nem utilize o serviço.',
  },
  {
    titulo: '2. Descrição do Serviço',
    texto:
      'O GeoPop é uma plataforma de rastreamento e monitoramento de veículos em tempo real. O serviço oferece visualização em mapa, histórico de percursos, relatórios de eventos, cercas virtuais e notificações de alertas, conforme o plano contratado pelo assinante.',
  },
  {
    titulo: '3. Cadastro e Conta',
    texto:
      'Você é responsável por fornecer informações verdadeiras, exatas e atualizadas no cadastro, e por manter a confidencialidade da sua senha. Todas as atividades realizadas com suas credenciais são de sua responsabilidade. Notifique-nos imediatamente em caso de uso não autorizado.',
  },
  {
    titulo: '4. Uso Adequado',
    texto:
      'Você concorda em utilizar o aplicativo apenas para fins lícitos e de acordo com a legislação vigente. É vedado tentar acessar áreas restritas, interferir no funcionamento do serviço ou utilizar os dados de rastreamento para finalidades ilegais ou que violem direitos de terceiros.',
  },
  {
    titulo: '5. Privacidade e Dados',
    texto:
      'Os dados de localização e uso são tratados conforme a Lei Geral de Proteção de Dados (LGPD). As informações coletadas são utilizadas exclusivamente para a prestação do serviço de rastreamento e não são compartilhadas com terceiros sem base legal ou seu consentimento.',
  },
  {
    titulo: '6. Limitação de Responsabilidade',
    texto:
      'O serviço é fornecido "como está". Não garantimos disponibilidade ininterrupta nem precisão absoluta das posições, que dependem de fatores externos como cobertura de rede, sinal de GPS e integridade do dispositivo rastreador instalado no veículo.',
  },
  {
    titulo: '7. Alterações dos Termos',
    texto:
      'Estes Termos podem ser atualizados a qualquer momento. Alterações relevantes serão comunicadas pelo aplicativo. O uso continuado após a atualização representa a aceitação dos novos termos.',
  },
];

export default function TermosScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View testID="termos-screen" style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="termos-back-btn" style={styles.backButton} onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft size={20} color="#18202D" />
        </Pressable>
        <Text style={styles.headerTitle}>Termos de Uso</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.updated}>Última atualização: 16/07/2026</Text>
        {SECOES.map((secao) => (
          <View key={secao.titulo} style={styles.secao}>
            <Text style={styles.secaoTitulo}>{secao.titulo}</Text>
            <Text style={styles.secaoTexto}>{secao.texto}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F8FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 24, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#E6E9EE', backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 42, height: 42, borderRadius: 14, borderWidth: 1, borderColor: '#DDE2E9',
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#18202D', fontSize: 18, fontWeight: '800' },
  content: { paddingHorizontal: 24, paddingTop: 20 },
  updated: { color: '#9CA3AF', fontSize: 12, marginBottom: 18 },
  secao: { marginBottom: 20 },
  secaoTitulo: { color: '#18202D', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  secaoTexto: { color: '#4B5563', fontSize: 14, lineHeight: 21 },
});
