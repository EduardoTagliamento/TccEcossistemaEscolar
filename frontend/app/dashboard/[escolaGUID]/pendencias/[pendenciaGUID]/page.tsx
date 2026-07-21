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

import { ChangeEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  Pendencia,
  PendenciaAnexo,
  buscarPendencia,
  listarAnexosPendencia,
  vincularAnexoPendencia,
  marcarComoFeito,
} from '@/lib/api/pendencia.api';
import { uploadAnexo, ANEXO_TAMANHO_MAXIMO_BYTES, ANEXO_MIME_TYPES_PERMITIDOS } from '@/lib/api/anexo.api';
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

  const [pendencia, setPendencia] = useState<Pendencia | null>(null);
  const [anexos, setAnexos] = useState<PendenciaAnexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [enviandoAnexo, setEnviandoAnexo] = useState(false);
  const [concluindo, setConcluindo] = useState(false);

  useEffect(() => {
    if (!authLoading && !usuario) {
      router.push('/login');
      return;
    }
    if (usuario && pendenciaGUID) {
      void carregarDados();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario, authLoading, pendenciaGUID]);

  const carregarDados = async () => {
    setLoading(true);
    setErro(null);
    try {
      const pendenciaData = await buscarPendencia(pendenciaGUID);
      setPendencia(pendenciaData);
      const anexosData = await listarAnexosPendencia(pendenciaGUID);
      setAnexos(anexosData);
    } catch (err: any) {
      setErro(err?.message || 'Falha ao carregar pendência');
    } finally {
      setLoading(false);
    }
  };

  const souDestinatario = !!usuario && !!pendencia && usuario.UsuarioCPF === pendencia.UsuarioCPF;

  const handleSelecionarArquivo = async (event: ChangeEvent<HTMLInputElement>) => {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
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
      await vincularAnexoPendencia(pendencia.PendenciaGUID, anexo.AnexoGUID);
      const anexosAtualizados = await listarAnexosPendencia(pendencia.PendenciaGUID);
      setAnexos(anexosAtualizados);
    } catch (err: any) {
      alert(err?.message || 'Erro ao anexar arquivo');
    } finally {
      setEnviandoAnexo(false);
    }
  };

  const handleConcluir = async () => {
    if (!pendencia) return;
    if (!confirm('Marcar esta pendência como concluída?')) return;

    setConcluindo(true);
    try {
      const pendenciaAtualizada = await marcarComoFeito(pendencia.PendenciaGUID);
      setPendencia(pendenciaAtualizada);
      window.dispatchEvent(new CustomEvent('baua:pendencia-atualizada'));
      alert('Pendência concluída!');
    } catch (err: any) {
      alert(err?.message || 'Erro ao concluir pendência');
    } finally {
      setConcluindo(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className={styles.container}>
        <p className={styles.loading}>Carregando pendência...</p>
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
            <>
              <input
                id="pendenciaAnexo"
                type="file"
                className={styles.inputFile}
                onChange={handleSelecionarArquivo}
                disabled={enviandoAnexo}
              />
              <p className={styles.hint}>
                {enviandoAnexo
                  ? 'Enviando arquivo...'
                  : 'PDF, imagens, Word, Excel, TXT ou ZIP — até 50MB.'}
              </p>
            </>
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
