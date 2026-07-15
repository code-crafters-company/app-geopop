import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth';

export default function Index() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return <Redirect href={isAuthenticated ? '/(app)' : '/(auth)/login'} />;
}
