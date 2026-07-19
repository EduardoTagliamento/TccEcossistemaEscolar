'use client';

/**
 * Rota antiga — mantida como redirect simples para não quebrar links/
 * favoritos existentes. A tela real de "Cadastro de Conteúdo" agora é a aba
 * "Conteúdo" de /dashboard/[escolaGUID]/cadastro (ver
 * cadastro/ConteudoForm.tsx). Nenhum link interno do app aponta mais pra
 * esta rota (confirmado via grep antes da consolidação).
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CrudConteudoRedirect() {
  const router = useRouter();
  const params = useParams();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  useEffect(() => {
    router.replace(`/dashboard/${escolaGUID}/cadastro?aba=conteudo`);
  }, [router, escolaGUID]);

  return null;
}
