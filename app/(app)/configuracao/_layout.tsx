import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { withLayoutContext } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../../src/components/theme';

const { Navigator } = createMaterialTopTabNavigator();
const MaterialTopTabs = withLayoutContext(Navigator);

export default function ConfiguracaoLayout() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <MaterialTopTabs
        screenOptions={{
          tabBarStyle: { backgroundColor: colors.surface },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: '#6B7280',
          tabBarIndicatorStyle: { backgroundColor: colors.primary },
          tabBarLabelStyle: { fontSize: 13, fontWeight: '700', textTransform: 'none' },
        }}
      >
        <MaterialTopTabs.Screen name="cercas" options={{ title: 'Cercas Virtuais' }} />
        <MaterialTopTabs.Screen name="velocidade" options={{ title: 'Velocidade' }} />
        <MaterialTopTabs.Screen name="conta" options={{ title: 'Conta' }} />
      </MaterialTopTabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
