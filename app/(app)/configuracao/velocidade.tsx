import React, { useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Modal, RefreshControl,
  StyleSheet, Text, TextInput, View, Pressable,
} from 'react-native';
import { Speedometer, PencilSimple } from 'phosphor-react-native';
import { useVeiculos, useAtualizarLimiteVelocidade } from '../../../src/hooks/useVeiculos';
import { Card } from '../../../src/components/Card';
import { Button } from '../../../src/components/Button';
import { EmptyState } from '../../../src/components/EmptyState';
import { colors, spacing, radius } from '../../../src/components/theme';
import type { Veiculo } from '../../../src/types';

function VeiculoLimiteRow({
  veiculo,
  onEdit,
}: {
  veiculo: Veiculo;
  onEdit: (v: Veiculo) => void;
}) {
  return (
    <Card style={styles.row}>
      <View style={styles.rowLeft}>
        <Speedometer size={22} color={colors.primary} weight="fill" />
        <View>
          <Text style={styles.placa}>{veiculo.placa}</Text>
          <Text style={styles.modelo}>{[veiculo.marca, veiculo.modelo].filter(Boolean).join(' ') || 'Sem modelo'}</Text>
        </View>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.limite}>
          {veiculo.limiteVelocidadeKmh ? `${veiculo.limiteVelocidadeKmh} km/h` : 'Sem limite'}
        </Text>
        <Pressable onPress={() => onEdit(veiculo)} hitSlop={8} testID={`edit-velocidade-${veiculo.id}`}>
          <PencilSimple size={18} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Card>
  );
}

export default function VelocidadeScreen() {
  const { data, isLoading, refetch, isRefetching } = useVeiculos();
  const atualizar = useAtualizarLimiteVelocidade();
  const [editVeiculo, setEditVeiculo] = useState<Veiculo | null>(null);
  const [limite, setLimite] = useState('');

  const items = data?.result ?? [];

  const handleSave = () => {
    if (!editVeiculo) return;
    const val = limite.trim() === '' ? null : parseInt(limite, 10);
    if (val !== null && (isNaN(val) || val < 1 || val > 300)) {
      Alert.alert('Valor inválido', 'Informe um limite entre 1 e 300 km/h.');
      return;
    }
    atualizar.mutate(
      { veiculoId: editVeiculo.id, limiteKmh: val },
      { onSuccess: () => { setEditVeiculo(null); refetch(); } }
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Limite de Velocidade</Text>
        <Text style={styles.subtitle}>Configure o alerta por veículo</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(v) => v.id}
          renderItem={({ item }) => (
            <VeiculoLimiteRow
              veiculo={item}
              onEdit={(v) => { setEditVeiculo(v); setLimite(v.limiteVelocidadeKmh?.toString() ?? ''); }}
            />
          )}
          ListEmptyComponent={<EmptyState title="Nenhum veículo" />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        />
      )}

      <Modal visible={!!editVeiculo} animationType="fade" transparent>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Limite de Velocidade</Text>
            <Text style={styles.modalSubtitle}>{editVeiculo?.placa}</Text>
            <TextInput
              testID="speed-limit-input"
              style={styles.limiteInput}
              value={limite}
              onChangeText={setLimite}
              keyboardType="numeric"
              placeholder="Ex: 80"
              placeholderTextColor={colors.textMuted}
              maxLength={3}
            />
            <Text style={styles.unit}>km/h · deixe vazio para remover</Text>
            <View style={styles.modalActions}>
              <Button label="Cancelar" variant="outline" onPress={() => setEditVeiculo(null)} style={{ flex: 1 }} testID="cancel-velocidade-btn" />
              <View style={{ width: spacing.sm }} />
              <Button label="Salvar" onPress={handleSave} loading={atualizar.isPending} style={{ flex: 1 }} testID="save-velocidade-btn" />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: 0 },
  title: { color: colors.text, fontSize: 20, fontWeight: '800' },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 2, marginBottom: spacing.md },
  list: { padding: spacing.lg, flexGrow: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.sm, gap: spacing.md,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  placa: { color: colors.text, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  modelo: { color: colors.textMuted, fontSize: 12 },
  limite: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  modal: {
    backgroundColor: colors.surface, borderRadius: radius.xl,
    padding: spacing.xl, width: '85%', alignItems: 'center',
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSubtitle: { color: colors.primary, fontSize: 14, fontWeight: '600', marginBottom: spacing.lg },
  limiteInput: {
    color: colors.text, fontSize: 48, fontWeight: '900',
    textAlign: 'center', minWidth: 100,
  },
  unit: { color: colors.textMuted, fontSize: 12, marginBottom: spacing.xl },
  modalActions: { flexDirection: 'row', width: '100%' },
});
