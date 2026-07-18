import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, Platform,
  Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View,
} from 'react-native';
import MapView, { Circle, Marker, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { ArrowCounterClockwise, PencilSimple, Plus, Trash } from 'phosphor-react-native';
import { useForm, Controller } from 'react-hook-form';
import { useAlterarCercaVirtual, useCercasVirtuais, useCriarCercaVirtual, useDeletarCercaVirtual } from '../../../src/hooks/useCercasVirtuais';
import { useVeiculos } from '../../../src/hooks/useVeiculos';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { Input } from '../../../src/components/Input';
import { Card } from '../../../src/components/Card';
import { colors, spacing, radius } from '../../../src/components/theme';
import type { CercaVirtual } from '../../../src/types';

type Ponto = { latitude: number; longitude: number };

function parsePontos(pontos?: string): Ponto[] {
  if (!pontos) return [];
  try {
    const parsed = JSON.parse(pontos);
    if (Array.isArray(parsed)) {
      return parsed.filter((p) => p && Number.isFinite(p.latitude) && Number.isFinite(p.longitude));
    }
  } catch {
    // Formato alternativo "lat,lng;lat,lng"
    const pares = pontos.split(';').map((par) => par.split(',').map(Number));
    if (pares.every((par) => par.length === 2 && par.every(Number.isFinite))) {
      return pares.map(([latitude, longitude]) => ({ latitude, longitude }));
    }
  }
  return [];
}

function CercaCard({ cerca, onEdit, onDelete }: { cerca: CercaVirtual; onEdit: (cerca: CercaVirtual) => void; onDelete: (id: string) => void }) {
  return (
    <Card style={styles.cercaCard} testID={`geofence-card-${cerca.nome}`}>
      <View style={styles.cercaHeader}>
        <View>
          <Text style={styles.cercaNome}>{cerca.nome}</Text>
          <Text style={styles.cercaPlaca}>{cerca.veiculoPlaca}</Text>
        </View>
        <View style={styles.cercaActions}>
          <Pressable testID={`edit-geofence-${cerca.nome}`} accessibilityLabel={`Editar cerca ${cerca.nome}`} onPress={() => onEdit(cerca)} hitSlop={8}>
            <PencilSimple size={20} color={colors.textSecondary} />
          </Pressable>
          <Pressable testID={`delete-geofence-${cerca.nome}`} accessibilityLabel={`Excluir cerca ${cerca.nome}`} onPress={() => onDelete(cerca.id)} hitSlop={8}>
            <Trash size={20} color={colors.error} />
          </Pressable>
        </View>
      </View>
      <View style={styles.cercaDetails}>
        <Text style={styles.detailText}>
          {cerca.tipo === 0 ? `Círculo · ${cerca.raio}m` : `Polígono · ${parsePontos(cerca.pontos).length} pontos`}
        </Text>
        <Text style={styles.detailText}>
          {[cerca.alertarEntrada ? '↓ Entrada' : null, cerca.alertarSaida ? '↑ Saída' : null].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </Card>
  );
}

export default function CercasScreen() {
  const [showModal, setShowModal] = useState(false);
  const [alertarEntrada, setAlertarEntrada] = useState(true);
  const [alertarSaida, setAlertarSaida] = useState(true);
  const [tipoCerca, setTipoCerca] = useState<0 | 1>(0);
  const [pontos, setPontos] = useState<Ponto[]>([]);
  const [editingCerca, setEditingCerca] = useState<CercaVirtual | null>(null);

  const { data, isLoading, refetch, isRefetching } = useCercasVirtuais();
  const { data: veiculos } = useVeiculos();
  const criar = useCriarCercaVirtual();
  const alterar = useAlterarCercaVirtual();
  const deletar = useDeletarCercaVirtual();

  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { nome: '', veiculoId: '', raio: '500', latitude: '', longitude: '' },
  });

  const items = data?.result ?? [];
  const veiculosList = veiculos?.result ?? [];
  const latitude = Number(watch('latitude'));
  const longitude = Number(watch('longitude'));
  const raio = Number(watch('raio'));
  const selectedVehicle = veiculosList.find((vehicle) => vehicle.id === watch('veiculoId'));
  const validCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);

  const handleDelete = (id: string) => {
    Alert.alert('Confirmar', 'Deletar esta cerca virtual?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Deletar', style: 'destructive', onPress: () => deletar.mutate(id) },
    ]);
  };

  const resetModal = () => {
    reset();
    setAlertarEntrada(true);
    setAlertarSaida(true);
    setTipoCerca(0);
    setPontos([]);
    setEditingCerca(null);
  };

  const openEdit = (cerca: CercaVirtual) => {
    setEditingCerca(cerca);
    reset({
      nome: cerca.nome,
      veiculoId: cerca.veiculoId,
      raio: String(cerca.raio ?? 500),
      latitude: cerca.latitude != null ? String(cerca.latitude) : '',
      longitude: cerca.longitude != null ? String(cerca.longitude) : '',
    });
    setTipoCerca(cerca.tipo);
    setPontos(parsePontos(cerca.pontos));
    setAlertarEntrada(cerca.alertarEntrada);
    setAlertarSaida(cerca.alertarSaida);
    setShowModal(true);
  };

  const onSubmit = (formData: { nome: string; veiculoId: string; raio: string; latitude: string; longitude: string }) => {
    if (!formData.nome.trim() || (!editingCerca && !formData.veiculoId)) {
      Alert.alert('Dados incompletos', 'Informe o nome e o veículo.');
      return;
    }
    if (tipoCerca === 0 && (!Number.isFinite(Number(formData.latitude)) || !Number.isFinite(Number(formData.longitude)) || Number(formData.raio) <= 0)) {
      Alert.alert('Dados incompletos', 'Informe o local no mapa e um raio maior que zero.');
      return;
    }
    if (tipoCerca === 1 && pontos.length < 3) {
      Alert.alert('Polígono incompleto', 'Toque no mapa para marcar pelo menos 3 pontos.');
      return;
    }
    const geo = tipoCerca === 0 ? {
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      raio: parseFloat(formData.raio),
    } : {
      pontos: JSON.stringify(pontos),
    };
    const options = {
      onSuccess: () => { resetModal(); setShowModal(false); },
      onError: () => Alert.alert('Erro', editingCerca ? 'Não foi possível salvar a cerca.' : 'Não foi possível criar a cerca.'),
    };
    if (editingCerca) {
      alterar.mutate({
        id: editingCerca.id,
        nome: formData.nome.trim(),
        tipo: tipoCerca,
        ...geo,
        alertarEntrada,
        alertarSaida,
      }, options);
    } else {
      criar.mutate({
        veiculoId: formData.veiculoId,
        nome: formData.nome.trim(),
        tipo: tipoCerca,
        ...geo,
        alertarEntrada,
        alertarSaida,
      }, options);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cercas Virtuais</Text>
        <Pressable style={styles.addBtn} onPress={() => { resetModal(); setShowModal(true); }} testID="add-cerca-btn">
          <Plus size={20} color={colors.primary} weight="bold" />
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => <CercaCard cerca={item} onEdit={openEdit} onDelete={handleDelete} />}
          ListEmptyComponent={
            <EmptyState title="Nenhuma cerca" message="Toque em + para criar uma cerca virtual." />
          }
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}

      {/* Create modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalInner} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{editingCerca ? 'Editar Cerca Virtual' : 'Nova Cerca Virtual'}</Text>

            <Controller control={control} name="nome" rules={{ required: 'Nome obrigatório' }}
              render={({ field: { onChange, value } }) => (
                <Input testID="geofence-name" label="Nome" placeholder="Ex: Garagem" onChangeText={onChange} value={value} error={errors.nome?.message} />
              )}
            />

            <Text style={styles.selectorLabel}>Veículo</Text>
            {editingCerca ? (
              <View style={[styles.veiculoChip, styles.veiculoChipActive, styles.veiculoChipFixed]}>
                <Text style={[styles.veiculoChipText, { color: colors.primary }]}>{editingCerca.veiculoPlaca}</Text>
              </View>
            ) : (
              <ScrollView horizontal style={styles.veiculoSelector} showsHorizontalScrollIndicator={false}>
                {veiculosList.map((v) => (
                  <Controller key={v.id} control={control} name="veiculoId"
                    render={({ field: { onChange, value } }) => (
                      <Pressable
                        testID={`geofence-vehicle-${v.id}`}
                        style={[styles.veiculoChip, value === v.id && styles.veiculoChipActive]}
                        onPress={() => onChange(v.id)}
                      >
                        <Text style={[styles.veiculoChipText, value === v.id && { color: colors.primary }]}>
                          {v.placa}
                        </Text>
                      </Pressable>
                    )}
                  />
                ))}
              </ScrollView>
            )}

            <Text style={styles.selectorLabel}>Tipo de cerca</Text>
            <View style={styles.tipoRow}>
              {([['Círculo', 0], ['Polígono', 1]] as const).map(([label, value]) => (
                <Pressable
                  key={value}
                  testID={`geofence-tipo-${value === 0 ? 'circulo' : 'poligono'}`}
                  style={[styles.tipoChip, tipoCerca === value && styles.tipoChipActive]}
                  onPress={() => setTipoCerca(value)}
                >
                  <Text style={[styles.tipoChipText, tipoCerca === value && { color: colors.primary }]}>{label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.selectorLabel}>
              {tipoCerca === 0 ? 'Toque no mapa para definir o centro' : 'Toque no mapa para adicionar os pontos do polígono'}
            </Text>
            <View style={styles.mapEditor} testID="geofence-map">
              <MapView
                style={StyleSheet.absoluteFillObject}
                provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                initialRegion={{
                  latitude: selectedVehicle?.latitude ?? -14.235,
                  longitude: selectedVehicle?.longitude ?? -51.925,
                  latitudeDelta: selectedVehicle?.latitude != null ? 0.04 : 25,
                  longitudeDelta: selectedVehicle?.longitude != null ? 0.04 : 25,
                }}
                onPress={({ nativeEvent }) => {
                  if (tipoCerca === 0) {
                    setValue('latitude', String(nativeEvent.coordinate.latitude), { shouldValidate: true });
                    setValue('longitude', String(nativeEvent.coordinate.longitude), { shouldValidate: true });
                  } else {
                    const ponto = nativeEvent.coordinate;
                    setPontos((prev) => [...prev, { latitude: ponto.latitude, longitude: ponto.longitude }]);
                  }
                }}
              >
                {tipoCerca === 0 && validCoordinates && <Circle center={{ latitude, longitude }} radius={Number.isFinite(raio) && raio > 0 ? raio : 500} fillColor={colors.primary + '28'} strokeColor={colors.primary} strokeWidth={2} />}
                {tipoCerca === 1 && pontos.length >= 3 && <Polygon coordinates={pontos} fillColor={colors.primary + '28'} strokeColor={colors.primary} strokeWidth={2} />}
                {tipoCerca === 1 && pontos.map((ponto, index) => (
                  <Marker key={`${ponto.latitude}-${ponto.longitude}-${index}`} coordinate={ponto} anchor={{ x: 0.5, y: 0.5 }}>
                    <View style={styles.pontoMarker} />
                  </Marker>
                ))}
              </MapView>
            </View>

            {tipoCerca === 0 ? (
              <>
                <View style={styles.coordsRow}>
                  <View style={{ flex: 1 }}>
                    <Controller control={control} name="latitude"
                      render={({ field: { onChange, value } }) => (
                        <Input testID="geofence-latitude" label="Latitude" placeholder="-23.5505" keyboardType="numeric" onChangeText={onChange} value={value} />
                      )}
                    />
                  </View>
                  <View style={{ width: spacing.sm }} />
                  <View style={{ flex: 1 }}>
                    <Controller control={control} name="longitude"
                      render={({ field: { onChange, value } }) => (
                        <Input testID="geofence-longitude" label="Longitude" placeholder="-46.6333" keyboardType="numeric" onChangeText={onChange} value={value} />
                      )}
                    />
                  </View>
                </View>

                <Controller control={control} name="raio"
                  render={({ field: { onChange, value } }) => (
                    <Input testID="geofence-radius" label="Raio (metros)" placeholder="500" keyboardType="numeric" onChangeText={onChange} value={value} />
                  )}
                />
              </>
            ) : (
              <View style={styles.pontosRow}>
                <Text style={styles.pontosText}>
                  {pontos.length === 0 ? 'Nenhum ponto marcado' : `Pontos: ${pontos.length}${pontos.length < 3 ? ' (mínimo 3)' : ''}`}
                </Text>
                <View style={styles.pontosActions}>
                  <Pressable
                    testID="geofence-remove-last"
                    style={[styles.pontoBtn, pontos.length === 0 && { opacity: 0.4 }]}
                    disabled={pontos.length === 0}
                    onPress={() => setPontos((prev) => prev.slice(0, -1))}
                  >
                    <ArrowCounterClockwise size={14} color={colors.textSecondary} />
                    <Text style={styles.pontoBtnText}>Remover último</Text>
                  </Pressable>
                  <Pressable
                    testID="geofence-clear-points"
                    style={[styles.pontoBtn, pontos.length === 0 && { opacity: 0.4 }]}
                    disabled={pontos.length === 0}
                    onPress={() => setPontos([])}
                  >
                    <Trash size={14} color={colors.error} />
                    <Text style={[styles.pontoBtnText, { color: colors.error }]}>Limpar</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Alertar Entrada</Text>
              <Switch value={alertarEntrada} onValueChange={setAlertarEntrada} trackColor={{ true: colors.primary }} />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Alertar Saída</Text>
              <Switch value={alertarSaida} onValueChange={setAlertarSaida} trackColor={{ true: colors.primary }} />
            </View>

            <View style={styles.modalActions}>
              <Button label="Cancelar" variant="outline" onPress={() => { resetModal(); setShowModal(false); }} style={{ flex: 1 }} testID="cancel-cerca-btn" />
              <View style={{ width: spacing.sm }} />
              <Button label={editingCerca ? 'Salvar' : 'Criar'} onPress={handleSubmit(onSubmit)} loading={criar.isPending || alterar.isPending} style={{ flex: 1 }} testID="submit-cerca-btn" />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary + '18',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.primary + '40',
  },
  list: { paddingHorizontal: spacing.lg, flexGrow: 1 },
  cercaCard: { marginBottom: spacing.sm },
  cercaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cercaActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  veiculoChipFixed: { alignSelf: 'flex-start', marginBottom: spacing.md },
  cercaNome: { color: colors.text, fontSize: 15, fontWeight: '700' },
  cercaPlaca: { color: colors.primary, fontSize: 12, marginTop: 2 },
  cercaDetails: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  detailText: { color: colors.textSecondary, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    maxHeight: '90%',
  },
  modalInner: { padding: spacing.xl },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.lg },
  selectorLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 6, fontWeight: '500' },
  veiculoSelector: { marginBottom: spacing.md },
  veiculoChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, marginRight: 8,
  },
  veiculoChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  veiculoChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  mapEditor: { height: 190, borderRadius: radius.lg, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder, marginBottom: spacing.md },
  coordsRow: { flexDirection: 'row' },
  tipoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  tipoChip: {
    flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.md,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder,
  },
  tipoChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '18' },
  tipoChipText: { color: colors.textSecondary, fontSize: 13, fontWeight: '600' },
  pontoMarker: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary,
    borderWidth: 2, borderColor: '#FFFFFF',
  },
  pontosRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md, gap: spacing.sm,
  },
  pontosText: { color: colors.textSecondary, fontSize: 12, flexShrink: 1 },
  pontosActions: { flexDirection: 'row', gap: spacing.sm },
  pontoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full,
    borderWidth: 1, borderColor: colors.cardBorder, backgroundColor: colors.card,
  },
  pontoBtnText: { color: colors.textSecondary, fontSize: 11, fontWeight: '600' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.cardBorder,
    marginBottom: spacing.sm,
  },
  switchLabel: { color: colors.text, fontSize: 14 },
  modalActions: { flexDirection: 'row', marginTop: spacing.lg },
});
