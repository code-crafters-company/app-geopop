import { Stack } from 'expo-router';
import { colors } from '../../../src/components/theme';

export default function VeiculosLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
