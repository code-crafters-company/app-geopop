import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '../src/stores/auth';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate().finally(() => SplashScreen.hideAsync());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F7F8FA' } }} />
    </QueryClientProvider>
  );
}
