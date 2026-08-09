'use client';

/**
 * Página de leitura de um Aviso — o clique no banner de destaque da home
 * (ver frontend/app/dashboard/[escolaGUID]/page.tsx) e nas notificações do
 * tipo `aviso_publicado` chegam aqui. Só o `buscarAviso(guid)` já marca a
 * visualização no backend (AvisoService.buscarAviso), sem chamada extra.
 */

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';
import { useAuth } from '@/lib/auth/AuthContext';
import { useAviso } from '@/lib/aviso/useAvisoQueries';
import * as AnexoAPI from '@/lib/api/anexo.api';
import * as TurmaAPI from '@/lib/api/turma.api';
import styles from './page.module.css';

export default function AvisoDetalhePage() {
  const params = useParams();
  const { usuario, isLoading: authLoading } = useAuth();
  const escolaGUID = (params?.escolaGUID as string) || '';
  const avisoGUID = (params?.avisoGUID as string) || '';

  const avisoQuery = useAviso(usuario ? avisoGUID : undefined);
  const aviso = avisoQuery.data;
  const erro = avisoQuery.error instanceof Error ? avisoQuery.error.message : null;

  const [nomesTurmas, setNomesTurmas] = useState<string[]>([]);

  useEffect(() => {
    if (aviso?.AvisoAbrangencia === 'Turmas' && aviso.TurmaGUIDs.length > 0) {
      Promise.all(aviso.TurmaGUIDs.map((guid) => TurmaAPI.buscarTurma(guid).catch(() => null)))
        .then((turmas) => setNomesTurmas(turmas.filter(Boolean).map((t) => `${t!.TurmaSerie} ${t!.TurmaNome}`)))
        .catch(() => setNomesTurmas([]));
    }
  }, [aviso]);

  if (authLoading || avisoQuery.isLoading) {
    return (
      <div className={styles.container}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '3rem 0' }}>
          <Loader />
          <p className={styles.loading}>Carregando aviso...</p>
        </div>
      </div>
    );
  }

  if (erro || !aviso) {
    return (
      <div className={styles.container}>
        <p className={styles.error}>{erro || 'Aviso não encontrado'}</p>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>
          ← Voltar para o início
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href={`/dashboard/${escolaGUID}`} className={styles.backLink}>
          ← Voltar para o início
        </Link>
      </header>

      <div className={styles.avisoCard}>
        <div className={styles.avisoHeader}>
          <div className={styles.icone}>
            <Icon name="bell" size={28} />
          </div>
          <div className={styles.titulos}>
            <h1>{aviso.AvisoTitulo}</h1>
            <p className={styles.meta}>
              Publicado em {new Date(aviso.AvisoCreatedAt).toLocaleString('pt-BR')}
            </p>
          </div>
          <span className={styles.badgeAbrangencia}>
            <Icon name={aviso.AvisoAbrangencia === 'Escola' ? 'home' : 'grid'} size={14} />
            {aviso.AvisoAbrangencia === 'Escola' ? 'Escola inteira' : 'Turmas específicas'}
          </span>
        </div>

        {aviso.AvisoAbrangencia === 'Turmas' && nomesTurmas.length > 0 && (
          <div className={styles.turmasList}>
            {nomesTurmas.map((nome) => (
              <span key={nome} className={styles.turmaChip}>{nome}</span>
            ))}
          </div>
        )}

        <p className={styles.conteudo}>{aviso.AvisoConteudo}</p>

        {aviso.Anexos.length > 0 && (
          <div className={styles.anexosSection}>
            <h3>Anexos</h3>
            <div className={styles.anexosList}>
              {aviso.Anexos.map((anexo) => (
                <button
                  key={anexo.AnexoGUID}
                  type="button"
                  className={styles.anexoItem}
                  onClick={() => AnexoAPI.baixarAnexo(anexo.AnexoGUID, anexo.AnexoNomeOriginal || undefined)}
                >
                  <Icon name="paperclip" size={14} /> {anexo.AnexoNomeOriginal || 'Arquivo anexado'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
