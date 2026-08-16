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

// Contraste automático pro título/avatar em cima da cor de fundo do card —
// necessário desde que a cor passou a poder vir da paleta da escola (que
// inclui a cor "clara" pensada pra hero, não só cores escuras de destaque),
// senão texto branco fixo fica ilegível em cima de um fundo claro.
function luminanciaRelativa(hex: string): number {
  const limpo = hex.replace('#', '');
  if (limpo.length !== 3 && limpo.length !== 6) return 0; // formato inesperado → assume escuro, cai pro texto branco
  const full = limpo.length === 3 ? limpo.split('').map((c) => c + c).join('') : limpo;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const canal = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function corTextoParaFundo(hex: string): string {
  return luminanciaRelativa(hex) > 0.5 ? '#0F1D17' : '#FFFFFF';
}

export default function MateriaTurmaCard({ href, titulo, subtitulo, imagemUrl, corFundo, temPendencia, avatarFotoUrl }: MateriaTurmaCardProps) {
  const cor = corFundo || '#17C077';
  const corTitulo = corTextoParaFundo(cor);

  return (
    <Link href={href} className={styles.card}>
      {temPendencia && <span className={styles.pendenciaIndicador} title="Tem pendência" />}
      <div
        className={styles.capa}
        style={imagemUrl ? { backgroundImage: `url(${imagemUrl})` } : { backgroundColor: cor }}
      >
        <span
          className={styles.capaTitulo}
          style={imagemUrl ? undefined : { color: corTitulo, textShadow: corTitulo === '#FFFFFF' ? undefined : 'none' }}
        >
          {titulo}
        </span>
      </div>
      {subtitulo && (
        <div className={styles.rodape}>
          {avatarFotoUrl ? (
            <img src={avatarFotoUrl} alt={subtitulo} className={styles.avatarFoto} />
          ) : (
            <span className={styles.avatar} style={{ backgroundColor: cor, color: corTitulo }}>
              {iniciais(subtitulo)}
            </span>
          )}
          <span className={styles.subtitulo}>{subtitulo}</span>
        </div>
      )}
    </Link>
  );
}
