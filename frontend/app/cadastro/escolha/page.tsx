'use client';

import Link from 'next/link';
import { poppins, figtree, baloo2 } from '@/lib/fonts';
import styles from './page.module.css';

const TELEFONE_BAUA = '12 988493959';

export default function EscolhaCadastroPage() {
  return (
    <div className={`${styles.page} ${poppins.variable} ${figtree.variable} ${baloo2.variable}`}>
      <div className={styles.card}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoBird} aria-hidden="true" />
          <span className={styles.logoWordmark}>bauá</span>
        </Link>

        <h1 className={styles.titulo}>Como você quer começar?</h1>

        <div className={styles.opcao}>
          <h2 className={styles.opcaoTitulo}>Já é aluno da Univap?</h2>
          <p className={styles.opcaoTexto}>
            Ative sua conta agora mesmo, em poucos cliques.
          </p>
          <Link href="/cadastro/univap" className={styles.botaoPrimario}>
            Sou aluno da Univap
          </Link>
        </div>

        <div className={styles.divisor} />

        <div className={styles.opcao}>
          <h2 className={styles.opcaoTitulo}>Cadastro de outra escola?</h2>
          <p className={styles.opcaoTexto}>
            No momento o cadastro de novas escolas é feito diretamente com a nossa equipe.
            Fale com a gente no WhatsApp:
          </p>
          <a
            href={`https://wa.me/55${TELEFONE_BAUA.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.botaoSecundario}
          >
            {TELEFONE_BAUA}
          </a>
        </div>
      </div>
    </div>
  );
}
