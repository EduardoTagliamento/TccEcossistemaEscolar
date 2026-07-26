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
 */

import { useEffect, useState } from 'react';
import { Icon, IconName } from '@/components/Icon';
import * as CategoriaConteudoAPI from '@/lib/api/categoriaconteudo.api';
import type { BoardGeral, ItemBoardGeral } from '@/lib/api/categoriaconteudo.api';
import styles from './GerenciarCategoriasModal.module.css';

const ICONE_POR_TIPO: Record<ItemBoardGeral['Tipo'], IconName> = {
  prova: 'award',
  tarefa_digital: 'upload',
  tarefa_presencial: 'edit',
  conteudo_video: 'camera',
  conteudo_texto: 'file-text',
  conteudo_imagem: 'layers',
};

interface GerenciarCategoriasModalProps {
  materiaGUID: string;
  onFechar: () => void;
}

export default function GerenciarCategoriasModal({ materiaGUID, onFechar }: GerenciarCategoriasModalProps) {
  const [board, setBoard] = useState<BoardGeral | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [novoNome, setNovoNome] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [categoriaArrastando, setCategoriaArrastando] = useState<string | null>(null);
  const [itemArrastando, setItemArrastando] = useState<ItemBoardGeral | null>(null);

  useEffect(() => {
    void carregarBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materiaGUID]);

  const carregarBoard = async () => {
    try {
      setCarregando(true);
      const resultado = await CategoriaConteudoAPI.buscarBoardGeral(materiaGUID);
      setBoard(resultado);
    } catch (erro) {
      console.error('Erro ao carregar categorias:', erro);
    } finally {
      setCarregando(false);
    }
  };

  const criarCategoria = async () => {
    const nome = novoNome.trim();
    if (!nome) return;
    try {
      setCriando(true);
      setErro(null);
      const resultado = await CategoriaConteudoAPI.criarCategoriaGeral(materiaGUID, nome);
      setBoard(resultado);
      setNovoNome('');
    } catch (erro: any) {
      setErro(erro?.message || 'Erro ao criar categoria');
    } finally {
      setCriando(false);
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
    setBoard((prev) => {
      if (!prev) return prev;
      const mapa = new Map(prev.Categorias.map((c) => [c.CategoriaNome, c]));
      return { ...prev, Categorias: ordemAtual.map((nome) => mapa.get(nome)!) };
    });

    try {
      const resultado = await CategoriaConteudoAPI.reordenarCategoriasGerais(materiaGUID, ordemAtual);
      setBoard(resultado);
    } catch (erro) {
      console.error('Erro ao reordenar categorias:', erro);
      await carregarBoard();
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
      const resultado = await CategoriaConteudoAPI.moverItemBoardGeral(
        materiaGUID,
        { ItemGUID: item.ItemGUID, Tipo: item.Tipo, TurmaGUID: item.TurmaGUID },
        categoriaNomeDestino
      );
      setBoard(resultado);
    } catch (erro) {
      console.error('Erro ao mover item:', erro);
      await carregarBoard();
    }
  };

  const renderItem = (item: ItemBoardGeral) => (
    <div
      key={`${item.Tipo}-${item.ItemGUID}`}
      className={styles.item}
      draggable
      onDragStart={(e) => handleItemDragStart(e, item)}
      onDragEnd={() => setItemArrastando(null)}
    >
      <Icon name={ICONE_POR_TIPO[item.Tipo]} size={15} />
      <span className={styles.itemTitulo}>{item.Titulo}</span>
      <span className={styles.itemTurma}>{item.TurmaSerie} {item.TurmaNome}</span>
    </div>
  );

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
                {board?.Categorias.map((categoria) => (
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
                    </div>
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
                  </div>
                ))}
              </div>

              <div
                className={styles.semCategoria}
                onDragOver={(e) => itemArrastando && e.preventDefault()}
                onDrop={(e) => {
                  if (!itemArrastando) return;
                  e.stopPropagation();
                  void moverItemPara(null);
                }}
              >
                <div className={styles.categoriaHeader}>
                  <span>Sem categoria</span>
                </div>
                <div className={styles.categoriaItens}>
                  {(board?.ItensSemCategoria.length ?? 0) === 0 ? (
                    <p className={styles.mensagemVaziaItens}>Nenhum item sem categoria.</p>
                  ) : (
                    board?.ItensSemCategoria.map(renderItem)
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
