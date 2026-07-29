'use client';

/**
 * Modal de edição in-context — reaproveita os 3 formulários já existentes
 * (ConteudoForm/TarefaForm/ProvaAgendadaForm) em modo edição (editarGUIDInicial),
 * sem sair da tela de categorias. Aberto pelo ícone de lápis do
 * VisualizadorItemModal (só professor).
 */

import { Icon } from '@/components/Icon';
import ConteudoForm from '@/app/dashboard/[escolaGUID]/cadastro/ConteudoForm';
import TarefaForm from '@/app/dashboard/[escolaGUID]/cadastro/TarefaForm';
import ProvaAgendadaForm from '@/app/dashboard/[escolaGUID]/cadastro/ProvaAgendadaForm';
import type { ItemCategoria } from '@/lib/api/materiasmodulo.api';
import styles from './NovoItemModal.module.css';

interface EditarItemModalProps {
  item: ItemCategoria;
  onFechar: () => void;
  onAtualizado: () => void;
}

const TITULOS: Record<ItemCategoria['Tipo'], string> = {
  conteudo_video: 'Editar conteúdo',
  conteudo_texto: 'Editar conteúdo',
  conteudo_imagem: 'Editar conteúdo',
  tarefa_digital: 'Editar tarefa',
  tarefa_presencial: 'Editar tarefa',
  tarefa_lista: 'Editar lista',
  prova: 'Editar prova',
};

export default function EditarItemModal({ item, onFechar, onAtualizado }: EditarItemModalProps) {
  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>{TITULOS[item.Tipo]}</h2>
          <button className={styles.botaoFechar} onClick={onFechar} title="Fechar">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className={styles.corpo}>
          {item.Tipo.startsWith('conteudo_') && (
            <ConteudoForm editarGUIDInicial={item.ItemGUID} ocultarListagem onCriado={onAtualizado} />
          )}
          {item.Tipo.startsWith('tarefa_') && (
            <TarefaForm editarGUIDInicial={item.ItemGUID} ocultarListagem onCriado={onAtualizado} />
          )}
          {item.Tipo === 'prova' && (
            <ProvaAgendadaForm editarGUIDInicial={item.ItemGUID} ocultarListagem onCriado={onAtualizado} />
          )}
        </div>
      </div>
    </div>
  );
}
