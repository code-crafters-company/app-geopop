import { useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

export function useAlterarSenha() {
  return useMutation({
    mutationFn: ({ id, novaSenha }: { id: string; novaSenha: string }) =>
      api.put('/usuario-app/reset-senha', { id, novaSenha }),
  });
}

// Doc App item 4: o usuário exclui a própria conta (inativa no backend).
export function useExcluirMinhaConta() {
  return useMutation({
    mutationFn: () => api.delete('/usuario-app/minha-conta'),
  });
}
