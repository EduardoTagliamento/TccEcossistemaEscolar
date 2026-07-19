'use client';

/**
 * Rota antiga — mantida como redirect simples para não quebrar links/
 * favoritos existentes. A tela real de "Cadastro de Prova Agendada" agora é
 * a aba "Prova Agendada" de /dashboard/[escolaGUID]/cadastro (ver
 * cadastro/ProvaAgendadaForm.tsx). Nenhum link interno do app aponta mais
 * pra esta rota (confirmado via grep antes da consolidação).
 */

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function CrudProvaAgendadaRedirect() {
  const router = useRouter();
  const params = useParams();
  const escolaGUIDParam = params?.escolaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';

  useEffect(() => {
    router.replace(`/dashboard/${escolaGUID}/cadastro?aba=prova`);
  }, [router, escolaGUID]);

  return null;
}
