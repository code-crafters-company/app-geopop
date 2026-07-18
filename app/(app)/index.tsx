import { HubConnectionBuilder, LogLevel, type HubConnection } from '@microsoft/signalr';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { BatteryMedium, Bell, CaretDown, CaretUp, Lightning, MagnifyingGlass, MapPin, MapTrifold, WifiHigh, WifiSlash } from 'phosphor-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, type MapType } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../src/components/theme';
import { useVeiculos } from '../../src/hooks/useVeiculos';
import { TENANT_KEY, TOKEN_KEY } from '../../src/services/api';
import { useTrackingStore } from '../../src/stores/tracking';
import { getVeiculoLocalizacao, hasVeiculoGps, isVeiculoOnline, type Veiculo } from '../../src/types';
import { formatDateTime, formatSpeed } from '../../src/utils/format';

const API_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'https://api.geopop.com.br/api/v1/').replace(/\/api\/v1\/?$/, '');
type IgnitionFilter = 'all' | 'on' | 'off';
const MAP_TYPE_LABELS: Record<MapType, string> = {
  standard: 'Padrão', satellite: 'Satélite', hybrid: 'Híbrido', terrain: 'Terreno',
  none: 'Nenhum', mutedStandard: 'Padrão', satelliteFlyover: 'Satélite', hybridFlyover: 'Híbrido',
};

export default function MapaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { data, isLoading } = useVeiculos();
  const { vehicles, setVehicles, updateVehicle, connected, setConnected } = useTrackingStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showList, setShowList] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<IgnitionFilter>('all');
  const [mapType, setMapType] = useState<MapType>('standard');
  const [showMapTypeMenu, setShowMapTypeMenu] = useState(false);

  useEffect(() => {
    if (data?.result) setVehicles(data.result);
  }, [data, setVehicles]);

  useEffect(() => {
    let disposed = false;
    let connection: HubConnection | undefined;

    (async () => {
      const tenant = await SecureStore.getItemAsync(TENANT_KEY) ?? process.env.EXPO_PUBLIC_DEFAULT_TENANT ?? 'default';
      if (disposed) return;
      connection = new HubConnectionBuilder()
        .withUrl(`${API_BASE}/hubs/rastreamento`, {
          accessTokenFactory: async () => await SecureStore.getItemAsync(TOKEN_KEY) ?? '',
          headers: { 'X-Tenant-Subdomain': tenant },
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.None)
        .build();

      connection.on('PosicaoAtualizada', (msg: {
        veiculoId: string; latitude: number; longitude: number; velocidade: number; ignicao: boolean; bateria?: number;
      }) => updateVehicle({
        id: msg.veiculoId,
        latitude: msg.latitude,
        longitude: msg.longitude,
        ultimaVelocidade: msg.velocidade,
        ignicao: msg.ignicao,
        bateriaPercentual: msg.bateria,
        ultimaPosicao: new Date().toISOString(),
      }));
      connection.on('VeiculoOffline', (msg: { veiculoId: string; ultimaPosicao?: string }) =>
        updateVehicle({ id: msg.veiculoId, ultimaPosicao: msg.ultimaPosicao }));
      connection.onreconnecting(() => setConnected(false));
      connection.onreconnected(async () => {
        setConnected(true);
        await Promise.all((data?.result ?? []).map((vehicle) => connection!.invoke('SubscribeVeiculo', vehicle.id)));
      });
      connection.onclose(() => setConnected(false));

      try {
        await connection.start();
        if (disposed) return;
        setConnected(true);
        await Promise.all((data?.result ?? []).map((vehicle) => connection!.invoke('SubscribeVeiculo', vehicle.id)));
      } catch {
        setConnected(false);
      }
    })();

    return () => {
      disposed = true;
      void connection?.stop();
    };
  }, [updateVehicle, data?.result?.length]);

  const list = useMemo(() => Object.values(vehicles), [vehicles]);
  const filtered = useMemo(() => list.filter((vehicle) => {
    if (filter === 'on' && !vehicle.ignicao) return false;
    if (filter === 'off' && vehicle.ignicao) return false;
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!query) return true;
    return [vehicle.placa, vehicle.favorecidoNome, vehicle.marca, vehicle.modelo]
      .some((value) => value?.toLocaleLowerCase('pt-BR').includes(query));
  }), [filter, list, search]);
  const selected = selectedId ? vehicles[selectedId] : null;
  const onlineCount = list.filter(isVeiculoOnline).length;

  function focusVehicle(vehicle: Veiculo) {
    setSelectedId(vehicle.id);
    setShowList(false);
    if (hasVeiculoGps(vehicle)) {
      mapRef.current?.animateToRegion({
        latitude: vehicle.latitude!, longitude: vehicle.longitude!, latitudeDelta: 0.01, longitudeDelta: 0.01,
      }, 500);
    }
  }

  return (
    <View style={styles.container} testID="map-screen">
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        userInterfaceStyle="light"
        mapType={mapType}
        initialRegion={{ latitude: -14.235, longitude: -51.925, latitudeDelta: 25, longitudeDelta: 25 }}
      >
        {list.filter(hasVeiculoGps).map((vehicle) => (
          <Marker
            key={vehicle.id}
            coordinate={{ latitude: vehicle.latitude!, longitude: vehicle.longitude! }}
            onPress={() => focusVehicle(vehicle)}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View style={[styles.marker, vehicle.ignicao ? styles.markerOn : styles.markerOff]}>
              <Text style={styles.markerText}>{vehicle.placa.slice(0, 3)}</Text>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <Image source={require('../../assets/images/logo-clara-wide.png')} style={styles.brandLogo} resizeMode="contain" accessibilityLabel="GeoPop" />
          <View style={styles.liveRow}><View style={[styles.liveDot, { backgroundColor: connected ? colors.success : colors.warning }]} /><Text style={styles.liveText}>{connected ? 'Rastreamento ao vivo' : 'Reconectando...'}</Text></View>
        </View>
        <Pressable testID="notifications-button" style={styles.bellButton} onPress={() => router.push('/(app)/notificacoes')} accessibilityLabel="Abrir notificações">
          <Bell size={23} color={colors.text} weight="fill" />
        </Pressable>
      </View>

      <View style={[styles.fleetSummary, { top: insets.top + 76 }]}>
        <Text style={styles.summaryTitle}>{list.length} veículos</Text>
        <Text style={styles.summaryOnline}>{onlineCount} online</Text>
        <Text style={styles.summaryOffline}>{list.length - onlineCount} offline</Text>
      </View>

      <View style={[styles.mapTypeWrap, { top: insets.top + 76 }]}>
        <Pressable testID="map-type-toggle" style={styles.mapTypeButton} onPress={() => setShowMapTypeMenu((value) => !value)}>
          <MapTrifold size={16} color={colors.text} />
          <Text style={styles.mapTypeLabel}>{MAP_TYPE_LABELS[mapType]}</Text>
          {showMapTypeMenu ? <CaretUp size={14} color={colors.textSecondary} /> : <CaretDown size={14} color={colors.textSecondary} />}
        </Pressable>
        {showMapTypeMenu && (
          <View style={styles.mapTypeMenu}>
            {(['standard', 'satellite', 'hybrid'] as const).map((value) => (
              <Pressable
                key={value}
                testID={`map-type-${value}`}
                style={styles.mapTypeOption}
                onPress={() => { setMapType(value); setShowMapTypeMenu(false); }}
              >
                <Text style={[styles.mapTypeOptionText, mapType === value && styles.mapTypeOptionTextActive]}>{MAP_TYPE_LABELS[value]}</Text>
                {mapType === value && <View style={styles.mapTypeCheck} />}
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {selected && !showList && <SelectedVehicle vehicle={selected} onOpen={() => router.push(`/(app)/veiculos/${selected.id}`)} bottom={insets.bottom + 76} />}

      <View testID="vehicle-panel" style={[styles.listPanel, { paddingBottom: showList ? insets.bottom : 0 }]}>
        <Pressable
          testID="vehicle-panel-toggle"
          style={styles.panelHandle}
          onPress={() => setShowList((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel="Meus veículos"
        >
          <View style={styles.handle} />
          <Text style={styles.panelTitle}>Meus veículos</Text>
          <View style={styles.panelActions}>
            <Pressable
              testID="open-vehicle-list"
              style={styles.seeAllBtn}
              onPress={() => router.push('/(app)/veiculos')}
              accessibilityLabel="Abrir lista completa de veículos"
              hitSlop={6}
            >
              <Text style={styles.seeAllText}>Ver todos</Text>
            </Pressable>
            {showList ? <CaretDown size={18} color={colors.textSecondary} /> : <CaretUp size={18} color={colors.textSecondary} />}
          </View>
        </Pressable>
        {showList && <>
          <View style={styles.searchWrap}>
            <MagnifyingGlass size={18} color={colors.textMuted} />
            <TextInput
              testID="vehicle-search"
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar placa, proprietário ou modelo"
              placeholderTextColor={colors.textMuted}
              style={styles.searchInput}
            />
          </View>
          <View style={styles.filters}>
            {(['all', 'on', 'off'] as const).map((value) => (
              <Pressable testID={`vehicle-filter-${value}`} key={value} onPress={() => setFilter(value)} style={[styles.filter, filter === value && styles.filterActive]}>
                <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{value === 'all' ? 'Todos' : value === 'on' ? 'Ligados' : 'Desligados'}</Text>
              </Pressable>
            ))}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(vehicle) => vehicle.id}
            renderItem={({ item }) => <VehicleRow vehicle={item} selected={item.id === selectedId} onPress={() => focusVehicle(item)} />}
            ListEmptyComponent={<Text style={styles.empty}>{isLoading ? 'Carregando veículos...' : 'Nenhum veículo encontrado.'}</Text>}
            style={styles.list}
          />
        </>}
      </View>
    </View>
  );
}

function VehicleRow({ vehicle, selected, onPress }: { vehicle: Veiculo; selected: boolean; onPress: () => void }) {
  const online = isVeiculoOnline(vehicle);
  return <Pressable testID={`vehicle-row-${vehicle.id}`} onPress={onPress} style={[styles.vehicleRow, selected && styles.vehicleSelected]}>
    <View style={[styles.vehicleState, { backgroundColor: vehicle.ignicao ? colors.success : colors.inactive }]} />
    <View style={styles.vehicleContent}>
      <View style={styles.vehicleHeader}>
        <Text style={styles.vehiclePlate}>{vehicle.placa}</Text>
        <View style={[styles.onlineBadge, { backgroundColor: online ? '#DCFCE7' : '#F3F4F6' }]}>
          {online ? <WifiHigh size={12} color="#047857" /> : <WifiSlash size={12} color={colors.textMuted} />}
          <Text style={{ color: online ? '#047857' : colors.textSecondary, fontSize: 9, fontWeight: '700' }}>{online ? 'Online' : 'Offline'}</Text>
        </View>
      </View>
      <Text style={styles.vehicleModel} numberOfLines={1}>{[vehicle.marca, vehicle.modelo].filter(Boolean).join(' ') || vehicle.favorecidoNome}</Text>
      <View style={styles.vehicleLocation}><MapPin size={12} color={hasVeiculoGps(vehicle) ? colors.success : colors.textMuted} /><Text style={styles.vehicleMeta} numberOfLines={1}>{getVeiculoLocalizacao(vehicle)}</Text></View>
      <View style={styles.vehicleFooter}><Lightning size={12} color={vehicle.ignicao ? colors.success : colors.error} /><Text style={styles.vehicleMeta}>{formatSpeed(vehicle.ultimaVelocidade)}</Text>{typeof vehicle.bateriaPercentual === 'number' && <><BatteryMedium size={12} color={colors.success} /><Text style={styles.vehicleMeta}>{vehicle.bateriaPercentual}%</Text></>}<Text style={styles.vehicleTime}>{vehicle.ultimaPosicao ? formatDateTime(vehicle.ultimaPosicao) : 'Sem posição'}</Text></View>
    </View>
  </Pressable>;
}

function SelectedVehicle({ vehicle, onOpen, bottom }: { vehicle: Veiculo; onOpen: () => void; bottom: number }) {
  return <Pressable testID="selected-vehicle-card" style={[styles.infoCard, { bottom }]} onPress={onOpen}>
    <View style={styles.vehicleHeader}><Text style={styles.infoPlate}>{vehicle.placa}</Text><Text style={styles.infoSpeed}>{formatSpeed(vehicle.ultimaVelocidade)}</Text></View>
    <Text style={styles.infoModel}>{[vehicle.marca, vehicle.modelo].filter(Boolean).join(' ')}</Text>
    <View style={styles.vehicleLocation}><MapPin size={14} color={colors.success} /><Text style={styles.infoLocation} numberOfLines={1}>{getVeiculoLocalizacao(vehicle)}</Text></View>
    <Text style={styles.infoTime}>{vehicle.ultimaPosicao ? `Última posição: ${formatDateTime(vehicle.ultimaPosicao)}` : 'Sem posição registrada'}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: 10, backgroundColor: '#FFFFFFF2', borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  brandLogo: { width: 118, height: 42, marginBottom: -4, marginLeft: -4 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { color: colors.textSecondary, fontSize: 10 },
  bellButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder },
  fleetSummary: { position: 'absolute', left: spacing.md, flexDirection: 'row', gap: 8, backgroundColor: '#FFFFFFF2', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.cardBorder },
  summaryTitle: { color: colors.text, fontSize: 11, fontWeight: '700' },
  summaryOnline: { color: '#047857', fontSize: 11, fontWeight: '600' },
  summaryOffline: { color: colors.textMuted, fontSize: 11 },
  mapTypeWrap: { position: 'absolute', right: spacing.md, alignItems: 'flex-end' },
  mapTypeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFFF2',
    borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 7,
    borderWidth: 1, borderColor: colors.cardBorder,
  },
  mapTypeLabel: { color: colors.text, fontSize: 11, fontWeight: '700' },
  mapTypeMenu: {
    marginTop: 6, backgroundColor: colors.surface, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden', minWidth: 120,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  mapTypeOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  mapTypeOptionText: { color: colors.textSecondary, fontSize: 13 },
  mapTypeOptionTextActive: { color: colors.text, fontWeight: '700' },
  mapTypeCheck: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  marker: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, borderWidth: 2 },
  markerOn: { backgroundColor: '#ECFDF5', borderColor: colors.success },
  markerOff: { backgroundColor: '#FFFFFF', borderColor: colors.textMuted },
  markerText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  listPanel: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '58%', backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderWidth: 1, borderBottomWidth: 0, borderColor: colors.cardBorder },
  panelHandle: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
  handle: { position: 'absolute', width: 42, height: 4, borderRadius: 2, backgroundColor: colors.inactive, top: 6, left: '50%' },
  panelTitle: { color: colors.text, fontSize: 15, fontWeight: '800', paddingTop: 5 },
  panelActions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 5 },
  seeAllBtn: {
    borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.full,
    paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.background,
  },
  seeAllText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700' },
  searchWrap: { marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.md, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, height: 42, color: colors.text, fontSize: 13 },
  filters: { flexDirection: 'row', gap: 7, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  filter: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6 },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  filterTextActive: { color: '#111111' },
  list: { minHeight: 90 },
  empty: { color: colors.textMuted, fontSize: 13, padding: spacing.lg },
  vehicleRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: spacing.lg, paddingVertical: 10 },
  vehicleSelected: { backgroundColor: '#FFF7ED' },
  vehicleState: { width: 4, borderRadius: 2, marginRight: 10 },
  vehicleContent: { flex: 1 },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vehiclePlate: { color: colors.text, fontSize: 14, fontWeight: '800', letterSpacing: 0.7 },
  vehicleModel: { color: colors.textSecondary, fontSize: 11, marginTop: 1 },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  vehicleLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  vehicleMeta: { color: colors.textSecondary, fontSize: 10, flexShrink: 1 },
  vehicleFooter: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  vehicleTime: { color: colors.textMuted, fontSize: 9, marginLeft: 'auto' },
  infoCard: { position: 'absolute', left: spacing.lg, right: spacing.lg, backgroundColor: '#FFFFFFF5', borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.cardBorder, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 4 },
  infoPlate: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  infoSpeed: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  infoModel: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  infoLocation: { color: colors.textSecondary, fontSize: 12, flex: 1 },
  infoTime: { color: colors.textMuted, fontSize: 10, marginTop: 5 },
});
