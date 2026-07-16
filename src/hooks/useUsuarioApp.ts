import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

export function useAlterarSenha() {
  return useMutation({
    mutationFn: ({ id, novaSenha }: { id: string; novaSenha: string }) =>
      api.put('/usuario-app/reset-senha', { id, novaSenha }),
  });
}
