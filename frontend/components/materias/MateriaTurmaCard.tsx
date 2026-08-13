'use client';

import Link from 'next/link';
import styles from './MateriaTurmaCard.module.css';

interface MateriaTurmaCardProps {
  href: string;
  titulo: string;
  subtitulo?: string;
  imagemUrl?: string | null;
  corFundo?: string | null;
  temPendencia?: boolean;
  /** Foto de quem aparece no avatar circular (ex.: professor da matéria) — sem isso, cai pras iniciais do subtítulo. */
  avatarFotoUrl?: string | null;
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  const primeira = partes[0]?.[0] || '';
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
  return (primeira + ultima).toUpperCase();
}

export default function MateriaTurmaCard({ href, titulo, subtitulo, imagemUrl, corFundo, temPendencia, avatarFotoUrl }: MateriaTurmaCardProps) {
  const cor = corFundo || '#17C077';

  return (
    <Link href={href} className={styles.card}>
      {temPendencia && <span className={styles.pendenciaIndicador} title="Tem pendência" />}
      <div
        className={styles.capa}
        style={imagemUrl ? { backgroundImage: `url(${imagemUrl})` } : { backgroundColor: cor }}
      >
        <span className={styles.capaTitulo}>{titulo}</span>
      </div>
      {subtitulo && (
        <div className={styles.rodape}>
          {avatarFotoUrl ? (
            <img src={avatarFotoUrl} alt={subtitulo} className={styles.avatarFoto} />
          ) : (
            <span className={styles.avatar} style={{ backgroundColor: cor }}>{iniciais(subtitulo)}</span>
          )}
          <span className={styles.subtitulo}>{subtitulo}</span>
        </div>
      )}
    </Link>
  );
}
