'use client';

/**
 * Modal do "+" na tela de seleção de turma (escolha-turma) — gerencia as
 * categorias "gerais" do professor pra essa matéria: criar categoria nova
 * (aplicada em massa em todas as turmas onde ele leciona essa matéria) e
 * organizar itens sem categoria/reordenar categorias via drag-and-drop,
 * no mesmo esquema nativo (HTML5 DnD) já usado na tela de categorias da turma.
 *
 * Categorias criadas aqui são sempre as "do professor" (generalizadas pra
 * todas as turmas) — futuramente, categorias criadas por representantes de
 * turma serão por-turma e não aparecerão nesta tela.
 *
 * Itens de conteúdo/prova aparecem condensados numa linha só quando estão em
 * 2+ turmas (mesmo item, fan-out); o que só 1 turma tem fica de fora — é
 * organização daquela turma específica, não "geral" (ver tela de categorias
 * da própria turma). Tarefa é sempre de 1 turma só, então continua aparecendo
 * normalmente, sem condensar.
 */

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Icon, IconName } from '@/components/Icon';
import type { ItemBoardGeral } from '@/lib/api/categoriaconteudo.api';
import { useBoardGeral } from '@/lib/categoriaconteudo/useCategoriaConteudoQueries';
import { useCriarCategoriaGeral, useReordenarCategoriasGerais, useMoverItemBoardGeral } from '@/lib/categoriaconteudo/useCategoriaConteudoMutations';
import { categoriaConteudoKeys } from '@/lib/categoriaconteudo/queryKeys';
import styles from './GerenciarCategoriasModal.module.css';

const ICONE_POR_TIPO: Record<ItemBoardGeral['Tipo'], IconName> = {
  prova: 'award',
  tarefa_digital: 'upload',
  tarefa_presencial: 'edit',
  tarefa_lista: 'list',
  conteudo_video: 'camera',
  conteudo_texto: 'file-text',
  conteudo_imagem: 'layers',
};

interface GerenciarCategoriasModalProps {
  materiaGUID: string;
  onFechar: () => void;
}

export default function GerenciarCategoriasModal({ materiaGUID, onFechar }: GerenciarCategoriasModalProps) {
  const queryClient = useQueryClient();
  const boardQuery = useBoardGeral(materiaGUID);
  const board = boardQuery.data ?? null;
  const carregando = boardQuery.isLoading;

  const [novoNome, setNovoNome] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const [categoriaArrastando, setCategoriaArrastando] = useState<string | null>(null);
  const [itemArrastando, setItemArrastando] = useState<ItemBoardGeral | null>(null);
  const [categoriasColapsadas, setCategoriasColapsadas] = useState<Set<string>>(new Set());

  const criarCategoriaMutation = useCriarCategoriaGeral();
  const reordenarCategoriasMutation = useReordenarCategoriasGerais();
  const moverItemMutation = useMoverItemBoardGeral();
  const criando = criarCategoriaMutation.isPending;

  const alternarColapso = (chave: string) => {
    setCategoriasColapsadas((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(chave)) proximo.delete(chave);
      else proximo.add(chave);
      return proximo;
    });
  };

  const criarCategoria = async () => {
    const nome = novoNome.trim();
    if (!nome) return;
    setErro(null);
    try {
      await criarCategoriaMutation.mutateAsync({ materiaGUID, categoriaNome: nome });
      setNovoNome('');
    } catch (erro: any) {
      setErro(erro?.message || 'Erro ao criar categoria');
    }
  };

  const handleCategoriaDragStart = (nome: string) => setCategoriaArrastando(nome);

  const handleCategoriaDrop = async (nomeDestino: string) => {
    if (!board || !categoriaArrastando || categoriaArrastando === nomeDestino) {
      setCategoriaArrastando(null);
      return;
    }

    const ordemAtual = board.Categorias.map((c) => c.CategoriaNome);
    const origemIdx = ordemAtual.indexOf(categoriaArrastando);
    const destinoIdx = ordemAtual.indexOf(nomeDestino);
    ordemAtual.splice(origemIdx, 1);
    ordemAtual.splice(destinoIdx, 0, categoriaArrastando);

    setCategoriaArrastando(null);
    queryClient.setQueryData(categoriaConteudoKeys.boardGeral(materiaGUID), (prev: typeof board) => {
      if (!prev) return prev;
      const mapa = new Map(prev.Categorias.map((c) => [c.CategoriaNome, c]));
      return { ...prev, Categorias: ordemAtual.map((nome) => mapa.get(nome)!) };
    });

    try {
      await reordenarCategoriasMutation.mutateAsync({ materiaGUID, ordemNomes: ordemAtual });
    } catch (erro) {
      console.error('Erro ao reordenar categorias:', erro);
      await boardQuery.refetch();
    }
  };

  const handleItemDragStart = (e: React.DragEvent, item: ItemBoardGeral) => {
    e.stopPropagation();
    setItemArrastando(item);
  };

  const moverItemPara = async (categoriaNomeDestino: string | null) => {
    if (!itemArrastando) return;
    const item = itemArrastando;
    setItemArrastando(null);
    try {
      await moverItemMutation.mutateAsync({
        materiaGUID,
        item: { ItemGUID: item.ItemGUID, Tipo: item.Tipo, TurmaGUID: item.Turmas[0].TurmaGUID },
        categoriaNomeDestino,
      });
    } catch (erro) {
      console.error('Erro ao mover item:', erro);
      await boardQuery.refetch();
    }
  };

  const renderItem = (item: ItemBoardGeral) => {
    const rotuloTurmas =
      item.Turmas.length === 1
        ? `${item.Turmas[0].TurmaSerie} ${item.Turmas[0].TurmaNome}`
        : `${item.Turmas.length} turmas`;
    const tituloTurmas = item.Turmas.map((t) => `${t.TurmaSerie} ${t.TurmaNome}`).join(', ');

    return (
      <div
        key={`${item.Tipo}-${item.ItemGUID}`}
        className={styles.item}
        draggable
        onDragStart={(e) => handleItemDragStart(e, item)}
        onDragEnd={() => setItemArrastando(null)}
      >
        <Icon name={ICONE_POR_TIPO[item.Tipo]} size={15} />
        <span className={styles.itemTitulo}>{item.Titulo}</span>
        <span className={styles.itemTurma} title={tituloTurmas}>{rotuloTurmas}</span>
      </div>
    );
  };

  return (
    <div className={styles.overlay} onClick={onFechar}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>Gerenciar categorias</h2>
          <button className={styles.botaoFechar} onClick={onFechar} title="Fechar">
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className={styles.corpo}>
          <p className={styles.hint}>
            Categorias criadas aqui são aplicadas em todas as turmas onde você leciona essa matéria.
          </p>

          <div className={styles.formNovaCategoria}>
            <input
              type="text"
              placeholder="Nome da nova categoria"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void criarCategoria()}
            />
            <button onClick={() => void criarCategoria()} disabled={criando || !novoNome.trim()}>
              <Icon name="plus" size={16} /> {criando ? 'Criando...' : 'Criar'}
            </button>
          </div>
          {erro && <p className={styles.erro}>{erro}</p>}

          {carregando ? (
            <p className={styles.hint}>Carregando categorias...</p>
          ) : (
            <>
              <div className={styles.listaCategorias}>
                {(board?.Categorias.length ?? 0) === 0 && (
                  <p className={styles.mensagemVazia}>Nenhuma categoria criada ainda.</p>
                )}
                {board?.Categorias.map((categoria) => {
                  const colapsada = categoriasColapsadas.has(categoria.CategoriaNome);
                  return (
                    <div
                      key={categoria.CategoriaNome}
                      className={styles.categoria}
                      draggable
                      onDragStart={() => handleCategoriaDragStart(categoria.CategoriaNome)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => void handleCategoriaDrop(categoria.CategoriaNome)}
                    >
                      <div className={styles.categoriaHeader}>
                        <Icon name="folder" size={16} />
                        <span>{categoria.CategoriaNome}</span>
                        <button
                          type="button"
                          className={styles.botaoColapsar}
                          onClick={() => alternarColapso(categoria.CategoriaNome)}
                          title={colapsada ? 'Expandir categoria' : 'Minimizar categoria'}
                        >
                          <Icon
                            name="chevron-down"
                            size={16}
                            className={`${styles.iconeColapsar} ${colapsada ? styles.iconeColapsarFechado : ''}`}
                          />
                        </button>
                      </div>
                      {!colapsada && (
                        <div
                          className={styles.categoriaItens}
                          onDragOver={(e) => itemArrastando && e.preventDefault()}
                          onDrop={(e) => {
                            if (!itemArrastando) return;
                            e.stopPropagation();
                            void moverItemPara(categoria.CategoriaNome);
                          }}
                        >
                          {categoria.Itens.length === 0 ? (
                            <p className={styles.mensagemVaziaItens}>Arraste itens sem categoria pra cá.</p>
                          ) : (
                            categoria.Itens.map(renderItem)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className={styles.semCategoria}>
                <div className={styles.categoriaHeader}>
                  <span>Sem categoria</span>
                  <button
                    type="button"
                    className={styles.botaoColapsar}
                    onClick={() => alternarColapso('__sem_categoria__')}
                    title={categoriasColapsadas.has('__sem_categoria__') ? 'Expandir' : 'Minimizar'}
                  >
                    <Icon
                      name="chevron-down"
                      size={16}
                      className={`${styles.iconeColapsar} ${
                        categoriasColapsadas.has('__sem_categoria__') ? styles.iconeColapsarFechado : ''
                      }`}
                    />
                  </button>
                </div>
                {!categoriasColapsadas.has('__sem_categoria__') && (
                  <div
                    className={styles.categoriaItens}
                    onDragOver={(e) => itemArrastando && e.preventDefault()}
                    onDrop={(e) => {
                      if (!itemArrastando) return;
                      e.stopPropagation();
                      void moverItemPara(null);
                    }}
                  >
                    {(board?.ItensSemCategoria.length ?? 0) === 0 ? (
                      <p className={styles.mensagemVaziaItens}>Nenhum item sem categoria.</p>
                    ) : (
                      board?.ItensSemCategoria.map(renderItem)
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
