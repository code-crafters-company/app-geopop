import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BatteryMedium, Car, Lightning, LightningSlash, MapPin, WifiHigh, WifiSlash } from 'phosphor-react-native';
import { colors, radius, spacing } from './theme';
import { getVeiculoLocalizacao, hasVeiculoGps, isVeiculoOnline, type Veiculo } from '../types';
import { formatSpeed, formatDateTime } from '../utils/format';

interface Props {
  veiculo: Veiculo;
  onPress?: () => void;
  testID?: string;
}

export function VeiculoCard({ veiculo, onPress, testID }: Props) {
  const ignicaoColor = veiculo.ignicao ? colors.ignitionOn : colors.ignitionOff;
  const online = isVeiculoOnline(veiculo);
  const hasGps = hasVeiculoGps(veiculo);

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: ignicaoColor + '18' }]}>
        <Car size={28} color={veiculo.ignicao ? colors.success : colors.textMuted} weight="fill" />
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.placa}>{veiculo.placa}</Text>
          <View style={[styles.onlineBadge, { backgroundColor: online ? '#DCFCE7' : '#F3F4F6' }]}>
            {online ? <WifiHigh size={12} color={colors.success} /> : <WifiSlash size={12} color={colors.textMuted} />}
            <Text style={[styles.onlineText, { color: online ? '#047857' : colors.textSecondary }]}>{online ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        {(veiculo.marca || veiculo.modelo) && (
          <Text style={styles.modelo}>{[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ')}</Text>
        )}
        <Text style={styles.owner} numberOfLines={1}>{veiculo.favorecidoNome}</Text>
        <View style={styles.locationRow}>
          <MapPin size={13} color={hasGps ? colors.success : colors.textMuted} weight="fill" />
          <Text style={styles.location} numberOfLines={1}>{getVeiculoLocalizacao(veiculo)}</Text>
        </View>
        <View style={styles.metaRow}>
          {veiculo.ignicao
            ? <Lightning size={14} color={ignicaoColor} weight="fill" />
            : <LightningSlash size={14} color={ignicaoColor} />}
          <Text style={styles.metaText}>{formatSpeed(veiculo.ultimaVelocidade)}</Text>
          {typeof veiculo.bateriaPercentual === 'number' && <><BatteryMedium size={14} color={colors.success} /><Text style={styles.metaText}>{veiculo.bateriaPercentual}%</Text></>}
        </View>
      </View>
      <View style={styles.right}>
        {veiculo.ultimaPosicao && (
          <Text style={styles.time}>{formatDateTime(veiculo.ultimaPosicao)}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 },
  placa: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: 1 },
  modelo: { color: colors.textSecondary, fontSize: 12, marginBottom: 2 },
  owner: { color: colors.textMuted, fontSize: 12 },
  right: { alignItems: 'flex-end', maxWidth: 76 },
  time: { color: colors.textMuted, fontSize: 9, marginTop: 2, textAlign: 'right' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  onlineText: { fontSize: 9, fontWeight: '700' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  location: { color: colors.textSecondary, fontSize: 11, flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { color: colors.textSecondary, fontSize: 10, marginRight: 5 },
});
