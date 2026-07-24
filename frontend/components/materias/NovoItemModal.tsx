'use client';

/**
 * Modal in-context do "+" — reaproveita os 3 formulários já existentes
 * (ConteudoForm/TarefaForm/ProvaAgendadaForm, de app/.../cadastro/) sem sair
 * da tela de categorias do módulo Matérias, já com matéria/turma/categoria
 * pré-preenchidas via prop.
 */

import { Icon } from '@/components/Icon';
import ConteudoForm from '@/app/dashboard/[escolaGUID]/cadastro/ConteudoForm';
import TarefaForm from '@/app/dashboard/[escolaGUID]/cadastro/TarefaForm';
import ProvaAgendadaForm from '@/app/dashboard/[escolaGUID]/cadastro/ProvaAgendadaForm';
import styles from './NovoItemModal.module.css';

export type NovoItemAba = 'conteudo' | 'tarefa' | 'prova';

interface NovoItemModalProps {
  aba: NovoItemAba;
  materiaGUID: string;
  turmaGUID?: string;
  categoriaGUID?: string;
  onFechar: () => void;
  onCriado: () => void;
}

const TITULOS: Record<NovoItemAba, string> = {
  conteudo: 'Novo conteúdo',
  tarefa: 'Nova tarefa',
  prova: 'Nova prova',
};

export default function NovoItemModal({ aba, materiaGUID, turmaGUID, categoriaGUID, onFechar, onCriado }: NovoItemModalProps) {
  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>{TITULOS[aba]}</h2>
          <button className={styles.botaoFechar} onClick={onFechar} title="Fechar">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className={styles.corpo}>
          {aba === 'conteudo' && (
            <ConteudoForm
              materiaGUIDInicial={materiaGUID}
              turmaGUIDInicial={turmaGUID}
              categoriaGUIDInicial={categoriaGUID}
              ocultarListagem
              onCriado={onCriado}
            />
          )}
          {aba === 'tarefa' && (
            <TarefaForm
              materiaGUIDInicial={materiaGUID}
              turmaGUIDInicial={turmaGUID}
              categoriaGUIDInicial={categoriaGUID}
              ocultarListagem
              onCriado={onCriado}
            />
          )}
          {aba === 'prova' && (
            <ProvaAgendadaForm
              materiaGUIDInicial={materiaGUID}
              turmaGUIDInicial={turmaGUID}
              categoriaGUIDInicial={categoriaGUID}
              ocultarListagem
              onCriado={onCriado}
            />
          )}
        </div>
      </div>
    </div>
  );
}
