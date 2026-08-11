import React from 'react';
import {
  ActivityIndicator, Platform, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Car, Lightning, LightningSlash, MapPin, WifiHigh, WifiSlash } from 'phosphor-react-native';
import { Pressable } from 'react-native';
import { useVeiculo } from '../../../src/hooks/useVeiculos';
import { useEndereco } from '../../../src/hooks/useEndereco';
import { useTrackingStore } from '../../../src/stores/tracking';
import { Card } from '../../../src/components/Card';
import { colors, spacing, radius } from '../../../src/components/theme';
import { formatSpeed, formatDateTime, formatCoord } from '../../../src/utils/format';
import { getVeiculoLocalizacao, hasVeiculoGps, isVeiculoOnline, type Veiculo } from '../../../src/types';

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export default function VeiculoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: buscado, isLoading } = useVeiculo(id);
  // Doc App item 2: a ignição (e demais dados dinâmicos) aparecia desatualizada —
  // o detalhe era uma busca única, sem tempo real. Mescla o estado AO VIVO do
  // store (atualizado por SignalR na Home) por cima do registro buscado.
  const live = useTrackingStore((s) => (id ? s.vehicles[id] : undefined));
  const veiculo: Veiculo | undefined = React.useMemo(
    () => (buscado || live ? ({ ...(buscado ?? {} as Veiculo), ...(live ?? {}) } as Veiculo) : undefined),
    [buscado, live],
  );
  // Hook no topo (antes de qualquer return) — desabilita sozinho sem coordenada.
  const { data: enderecoResolvido } = useEndereco(veiculo?.latitude, veiculo?.longitude);

  if (isLoading && !veiculo) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  if (!veiculo) return (
    <View style={[styles.container, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
      <Text style={styles.infoLabel}>Veículo não encontrado.</Text>
    </View>
  );

  const hasPos = hasVeiculoGps(veiculo);
  const online = isVeiculoOnline(veiculo);
  // Doc App item 2: endereço completo (nos dois locais que mostram o endereço).
  const endereco = enderecoResolvido ?? getVeiculoLocalizacao(veiculo);

  return (
    <View testID="vehicle-detail-screen" style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable testID="vehicle-detail-back" onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{veiculo.placa}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Map */}
        {hasPos && (
          <View style={styles.mapWrap}>
            <MapView
              style={StyleSheet.absoluteFillObject}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              userInterfaceStyle="light"
              initialRegion={{
                latitude: veiculo.latitude!,
                longitude: veiculo.longitude!,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
            >
              <Marker coordinate={{ latitude: veiculo.latitude!, longitude: veiculo.longitude! }}>
                <View style={[styles.marker, veiculo.ignicao ? styles.markerOn : styles.markerOff]}>
                  <Car size={20} color="#fff" weight="fill" />
                </View>
              </Marker>
            </MapView>
          </View>
        )}

        {/* Status cards */}
        <View style={styles.statusRow}>
          <Card style={styles.statusCard}>
            <Text style={styles.statusLabel}>Velocidade</Text>
            <Text style={[styles.statusValue, { color: colors.primary }]}>
              {formatSpeed(veiculo.ultimaVelocidade)}
            </Text>
          </Card>
          <Card style={styles.statusCard}>
            <Text style={styles.statusLabel}>Ignição</Text>
            <View style={styles.statusIcon}>
              {veiculo.ignicao
                ? <Lightning size={24} color={colors.success} weight="fill" />
                : <LightningSlash size={24} color={colors.error} />}
              <Text style={[styles.statusValue, { color: veiculo.ignicao ? colors.success : colors.error }]}>
                {veiculo.ignicao ? 'Ligada' : 'Desligada'}
              </Text>
            </View>
          </Card>
          <Card style={styles.statusCard}>
            <Text style={styles.statusLabel}>Bateria</Text>
            <Text style={styles.statusValue}>
              {veiculo.bateriaPercentual != null ? `${veiculo.bateriaPercentual}%` : '—'}
            </Text>
          </Card>
        </View>

        <Card style={styles.gpsCard}>
          {online ? <WifiHigh size={20} color={colors.success} /> : <WifiSlash size={20} color={colors.textMuted} />}
          <View style={{ flex: 1 }}><Text style={styles.infoValue}>{online ? 'GPS online' : 'GPS offline'}</Text><Text style={styles.infoLabel} numberOfLines={2}>{endereco}</Text></View>
          <MapPin size={20} color={hasPos ? colors.success : colors.textMuted} weight="fill" />
        </Card>

        {/* Details */}
        <Card style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Identificação</Text>
          <InfoRow label="Placa" value={veiculo.placa} />
          <InfoRow label="Marca / Modelo" value={[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ')} />
          <InfoRow label="Cor" value={veiculo.cor} />
          <InfoRow label="Proprietário" value={veiculo.favorecidoNome} />
          <InfoRow label="Endereço" value={endereco} />
          <InfoRow label="Última posição" value={veiculo.ultimaPosicao ? formatDateTime(veiculo.ultimaPosicao) : null} />
          <InfoRow label="Coordenadas" value={formatCoord(veiculo.latitude, veiculo.longitude)} />
          {veiculo.limiteVelocidadeKmh && (
            <InfoRow label="Limite Velocidade" value={`${veiculo.limiteVelocidadeKmh} km/h`} />
          )}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: colors.text, fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  scroll: { padding: spacing.lg },
  mapWrap: { height: 220, borderRadius: radius.lg, overflow: 'hidden', marginBottom: spacing.lg },
  statusRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  statusCard: { flex: 1, alignItems: 'center', padding: spacing.md },
  statusLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 4 },
  statusValue: { color: colors.text, fontSize: 16, fontWeight: '700' },
  statusIcon: { alignItems: 'center', gap: 2 },
  detailsCard: { marginBottom: spacing.lg },
  gpsCard: { marginBottom: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700', marginBottom: spacing.md },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
  },
  infoLabel: { color: colors.textSecondary, fontSize: 13 },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: spacing.md },
  marker: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  markerOn: { backgroundColor: '#059669', borderColor: colors.success },
  markerOff: { backgroundColor: '#6B7280', borderColor: colors.error },
});
