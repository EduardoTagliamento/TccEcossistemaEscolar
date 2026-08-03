'use client';

import { useMutation } from '@tanstack/react-query';
import { atualizarUsuario, trocarSenha } from '@/lib/api/usuario.api';

export function useAtualizarUsuario() {
  return useMutation({
    mutationFn: ({ cpf, dados }: { cpf: string; dados: Parameters<typeof atualizarUsuario>[1] }) =>
      atualizarUsuario(cpf, dados),
  });
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: ({ cpf, senhaAtual, novaSenha }: { cpf: string; senhaAtual: string; novaSenha: string }) =>
      trocarSenha(cpf, senhaAtual, novaSenha),
  });
}
