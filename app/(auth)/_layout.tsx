import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Redirect href="/(app)" />;
  return <Stack screenOptions={{ headerShown: false }} />;
}
