'use client';

/**
 * Cadastro (Professor) — tela única com abas, condensando as 3 telas que
 * existiam antes (crud-tarefa, crud-provaagendada, crud-conteudo). Cada aba
 * reaproveita o formulário/lógica de negócio já existente, só desacoplado
 * da "página inteira" (ver TarefaForm.tsx, ProvaAgendadaForm.tsx,
 * ConteudoForm.tsx nesta mesma pasta).
 */

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import TarefaForm from './TarefaForm';
import ProvaAgendadaForm from './ProvaAgendadaForm';
import ConteudoForm from './ConteudoForm';
import styles from './page.module.css';

type Aba = 'tarefa' | 'prova' | 'conteudo';

const ABAS: Array<{ id: Aba; label: string }> = [
  { id: 'tarefa', label: 'Tarefa' },
  { id: 'prova', label: 'Prova Agendada' },
  { id: 'conteudo', label: 'Conteúdo' },
];

function abaInicialFromQuery(valor: string | null): Aba {
  if (valor === 'prova' || valor === 'conteudo' || valor === 'tarefa') return valor;
  return 'tarefa';
}

function CadastroConteudo() {
  const searchParams = useSearchParams();
  const [abaAtiva, setAbaAtiva] = useState<Aba>(() => abaInicialFromQuery(searchParams?.get('aba') ?? null));

  return (
    <div className={styles.container}>
      <div className={styles.pageWrap}>
        <h1 className={styles.pageTitle}>Cadastro</h1>
        <p className={styles.pageSubtitulo}>Crie e gerencie tarefas, provas agendadas e conteúdos de aula.</p>

        <div className={styles.abas} role="tablist">
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={abaAtiva === aba.id}
              className={abaAtiva === aba.id ? styles.abaAtiva : styles.aba}
              onClick={() => setAbaAtiva(aba.id)}
            >
              {aba.label}
            </button>
          ))}
        </div>

        <div className={styles.abaConteudo}>
          {abaAtiva === 'tarefa' && <TarefaForm />}
          {abaAtiva === 'prova' && <ProvaAgendadaForm />}
          {abaAtiva === 'conteudo' && <ConteudoForm />}
        </div>
      </div>
    </div>
  );
}

export default function CadastroPage() {
  return (
    <Suspense fallback={<div className={styles.container} />}>
      <CadastroConteudo />
    </Suspense>
  );
}
