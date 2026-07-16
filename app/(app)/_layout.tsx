import { Redirect, Tabs } from 'expo-router';
import { Bell, ChartLine, Gear, MapPin } from 'phosphor-react-native';
import { useAuthStore } from '../../src/stores/auth';
import { colors } from '../../src/components/theme';

export default function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#6B7280',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginTop: -2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mapa',
          tabBarButtonTestID: 'tab-mapa',
          tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="veiculos"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="relatorios"
        options={{
          title: 'Relatórios',
          tabBarButtonTestID: 'tab-relatorios',
          tabBarIcon: ({ color, size }) => <ChartLine size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="configuracao"
        options={{
          title: 'Configuração',
          tabBarButtonTestID: 'tab-configuracao',
          tabBarIcon: ({ color, size }) => <Gear size={size} color={color} weight="fill" />,
        }}
      />
      <Tabs.Screen
        name="notificacoes"
        options={{
          title: 'Alertas',
          tabBarButtonTestID: 'tab-alertas',
          tabBarIcon: ({ color, size }) => <Bell size={size} color={color} weight="fill" />,
        }}
      />
    </Tabs>
  );
}
