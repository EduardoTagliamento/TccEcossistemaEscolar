'use client';

/**
 * Detalhe / recebimento de uma Pendência — tela do destinatário: mostra
 * título/conteúdo/prazo, permite anexar arquivos (upload real via
 * `anexo.api.ts` + vínculo via `pendencia.api.ts`) e concluir a pendência
 * (`PATCH .../feito`, exclusivo do destinatário).
 *
 * Padrão estrutural extraído de
 * `frontend/app/dashboard/[escolaGUID]/tarefas/[tarefaGUID]/page.tsx`
 * (useParams/useAuth, guard de redirect pro /login, `carregarDados()`,
 * loading/erro) — mas diferente daquela tela, os botões de anexar/concluir
 * aqui são reais (com onClick, upload de fato, PATCH de fato), não
 * placeholders desabilitados.
 *
 * Guard de acesso: o backend já retorna 403 ("Sem permissão para acessar
 * esta pendência") para quem não é o destinatário nem admin da escola —
 * `buscarPendencia` propaga esse erro e a tela mostra um estado de acesso
 * negado. Já as ações de anexar/concluir (exclusivas do destinatário, mesmo
 * para admins visualizando a pendência de outra pessoa) são condicionadas a
 * `souDestinatario`, calculado a partir do CPF do usuário logado.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { usePendencia, useAnexosPendencia } from '@/lib/pendencia/usePendenciaQueries';
import { useMarcarComoFeito, useVincularAnexoPendencia } from '@/lib/pendencia/usePendenciaMutations';
import { uploadAnexo, ANEXO_TAMANHO_MAXIMO_BYTES, ANEXO_MIME_TYPES_PERMITIDOS } from '@/lib/api/anexo.api';
import Loader from '@/components/Loader';
import AnexoUploadField from '@/components/AnexoUploadField';
import styles from './page.module.css';

function formatarTamanho(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PendenciaDetalhesPage() {
  const params = useParams();
  const router = useRouter();
  const { usuario, isLoading: authLoading } = useAuth();
  const escolaGUIDParam = params?.escolaGUID;
  const pendenciaGUIDParam = params?.pendenciaGUID;
  const escolaGUID = Array.isArray(escolaGUIDParam) ? escolaGUIDParam[0] : escolaGUIDParam || '';
  const pendenciaGUID = Array.isArray(pendenciaGUIDParam) ? pendenciaGUIDParam[0] : pendenciaGUIDParam || '';

  const [enviandoAnexo, setEnviandoAnexo] = useState(false);

  const pendenciaQuery = usePendencia(pendenciaGUID || undefined);
  const pendencia = pendenciaQuery.data ?? null;
  const anexosQuery = useAnexosPendencia(pendenciaGUID || undefined);
  const anexos = anexosQuery.data ?? [];
  const loading = pendenciaQuery.isLoading;
  const erro = pendenciaQuery.error instanceof Error ? pendenciaQuery.error.message : null;

  const vincularAnexoMutation = useVincularAnexoPendencia();
  const marcarComoFeitoMutation = useMarcarComoFeito();
  const concluindo = marcarComoFeitoMutation.isPending;

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
    }
  }, [usuario, authLoading, router]);

  const souDestinatario = !!usuario && !!pendencia && usuario.UsuarioCPF === pendencia.UsuarioCPF;

  const handleSelecionarArquivo = async (arquivo: File | null) => {
    if (!arquivo || !pendencia) return;

    if (arquivo.size > ANEXO_TAMANHO_MAXIMO_BYTES) {
      alert('Arquivo maior que o limite permitido (50MB).');
      return;
    }
    if (!ANEXO_MIME_TYPES_PERMITIDOS.includes(arquivo.type)) {
      alert('Tipo de arquivo não permitido.');
      return;
    }

    setEnviandoAnexo(true);
    try {
      const anexo = await uploadAnexo(arquivo, escolaGUID);
      await vincularAnexoMutation.mutateAsync({ pendenciaGUID: pendencia.PendenciaGUID, anexoGUID: anexo.AnexoGUID });
    } catch (err: any) {
      alert(err?.message || 'Erro ao anexar arquivo');
    } finally {
      setEnviandoAnexo(false);
    }
  };

  const handleConcluir = async () => {
    if (!pendencia) return;
    if (!confirm('Marcar esta pendência como concluída?')) return;

    try {
      await marcarComoFeitoMutation.mutateAsync(pendencia.PendenciaGUID);
      alert('Pendência concluída!');
    } catch (err: any) {
      alert(err?.message || 'Erro ao concluir pendência');
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '3rem 0' }}>
          <Loader />
          <p className={styles.loading}>Carregando pendência...</p>
        </div>
      </div>
    );
  }

  if (erro || !pendencia) {
    const acessoNegado = (erro || '').toLowerCase().includes('permiss');
    return (
      <div className={styles.container}>
        <Link href={`/dashboard/${escolaGUID}/pendencias`} className={styles.backLink}>
          ← Voltar para Minhas Pendências
        </Link>
        {acessoNegado ? (
          <p className={styles.acessoNegado}>Você não tem acesso a esta pendência.</p>
        ) : (
          <p className={styles.erro}>{erro || 'Pendência não encontrada'}</p>
        )}
      </div>
    );
  }

  const atrasada = !pendencia.PendenciaFeito && new Date(pendencia.PendenciaPrazoData) < new Date();
  const status = pendencia.PendenciaFeito
    ? { texto: 'Feito', classe: styles.badgeFeito }
    : atrasada
      ? { texto: 'Atrasada', classe: styles.badgeAtrasada }
      : { texto: 'Pendente', classe: styles.badgePendente };

  return (
    <div className={styles.container}>
      <Link href={`/dashboard/${escolaGUID}/pendencias`} className={styles.backLink}>
        ← Voltar para Minhas Pendências
      </Link>

      <section className={styles.secao}>
        <div className={styles.tituloLinha}>
          <h1 className={styles.titulo}>{pendencia.PendenciaTitulo}</h1>
          <span className={`${styles.badge} ${status.classe}`}>{status.texto}</span>
        </div>
        <p className={styles.prazo}>
          Prazo: {new Date(pendencia.PendenciaPrazoData).toLocaleString('pt-BR')}
          {pendencia.PendenciaFeito && pendencia.PendenciaRealizacaoData && (
            <> · Concluída em {new Date(pendencia.PendenciaRealizacaoData).toLocaleString('pt-BR')}</>
          )}
        </p>
        {pendencia.PendenciaConteudo && <p className={styles.conteudo}>{pendencia.PendenciaConteudo}</p>}
      </section>

      <section className={styles.secao}>
        <h2 className={styles.secaoTitulo}>Anexos</h2>

        {anexos.length === 0 ? (
          <p className={styles.semAnexos}>Nenhum arquivo anexado ainda.</p>
        ) : (
          <ul className={styles.listaAnexos}>
            {anexos.map((anexo) => (
              <li key={anexo.AnexoGUID} className={styles.anexoItem}>
                <span>{anexo.AnexoNomeOriginal || anexo.AnexoGUID}</span>
                <span className={styles.anexoTamanho}>{formatarTamanho(anexo.AnexoTamanho)}</span>
              </li>
            ))}
          </ul>
        )}

        {souDestinatario ? (
          !pendencia.PendenciaFeito && (
            <AnexoUploadField
              id="pendenciaAnexo"
              arquivo={null}
              onChange={handleSelecionarArquivo}
              disabled={enviandoAnexo}
              textoArea={enviandoAnexo ? 'Enviando arquivo...' : 'Clique ou arraste um arquivo aqui'}
              hint="PDF, imagens, Word, Excel, TXT ou ZIP — até 50MB."
            />
          )
        ) : (
          <p className={styles.avisoSomenteDestinatario}>Apenas o destinatário pode anexar arquivos.</p>
        )}
      </section>

      {souDestinatario && (
        <div className={styles.rodape}>
          <button
            type="button"
            className={styles.botaoConcluir}
            onClick={handleConcluir}
            disabled={pendencia.PendenciaFeito || concluindo}
          >
            {pendencia.PendenciaFeito ? 'Concluída' : concluindo ? 'Concluindo...' : 'Concluir'}
          </button>
        </div>
      )}
    </div>
  );
}
