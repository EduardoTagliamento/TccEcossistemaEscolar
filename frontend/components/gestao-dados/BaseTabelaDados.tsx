import React, { useEffect, useState } from 'react';
import styles from './BaseTabelaDados.module.css';
import { Icon } from '@/components/Icon';
import Loader from '@/components/Loader';

export interface Coluna<T = any> {
  id: string; // Alterado de keyof T para string para permitir IDs arbitrários
  label: string;
  width?: string;
  render?: (valor: any, linha: T) => React.ReactNode;
}

interface BaseTabelaDadosProps<T = any> {
  titulo: string;
  colunas: Coluna<T>[];
  dados: T[];
  onEditar?: (item: T, index: number) => void;
  onExcluir?: (item: T, index: number) => void;
  acoes?: (item: T, index: number) => React.ReactNode;
  carregando?: boolean;
  mensagemVazia?: string;
  onNovoRegistro?: () => void;
  botaoNovoTexto?: string;
  /** Quando informado, exibe um campo de busca no header. O termo já chega em minúsculas. */
  filtrarPor?: (item: T, termoBusca: string) => boolean;
  buscaPlaceholder?: string;
}

export default function BaseTabelaDados<T = any>({
  titulo,
  colunas,
  dados,
  onEditar,
  onExcluir,
  acoes,
  carregando = false,
  mensagemVazia = 'Nenhum registro encontrado',
  onNovoRegistro,
  botaoNovoTexto = '+ Novo',
  filtrarPor,
  buscaPlaceholder = 'Buscar...'
}: BaseTabelaDadosProps<T>) {
  const [termoBusca, setTermoBusca] = useState('');
  // Paginação só no RENDER (a busca/filtro continua rodando sobre a lista
  // inteira) — listas que cresceram muito (ex.: pré-cadastro em massa pra
  // feira técnica, 1000+ alunos numa escola só) deixavam a tabela inteira
  // travada, porque o React montava uma <tr> por registro de uma vez.
  const ITENS_POR_PAGINA = 50;
  const [paginaAtual, setPaginaAtual] = useState(1);

  const termoBuscaNormalizado = termoBusca.trim().toLowerCase();
  const dadosFiltrados = filtrarPor && termoBuscaNormalizado
    ? dados.filter((item) => filtrarPor(item, termoBuscaNormalizado))
    : dados;

  const totalPaginas = Math.max(1, Math.ceil(dadosFiltrados.length / ITENS_POR_PAGINA));
  const paginaValida = Math.min(paginaAtual, totalPaginas);

  // Volta pra página 1 sempre que o termo de busca muda (senão dá pra ficar
  // numa página que não existe mais depois de filtrar).
  useEffect(() => {
    setPaginaAtual(1);
  }, [termoBuscaNormalizado]);

  const dadosPagina = dadosFiltrados.slice(
    (paginaValida - 1) * ITENS_POR_PAGINA,
    paginaValida * ITENS_POR_PAGINA
  );

  if (carregando) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>{titulo}</h2>
        </div>
        <div className={styles.carregando}>
          <Loader />
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.titulo}>
          {titulo} <span className={styles.contador}>({dadosFiltrados.length})</span>
        </h2>
        <div className={styles.headerAcoes}>
          {filtrarPor && (
            <div className={styles.buscaContainer}>
              <Icon name="search" size={16} className={styles.buscaIcone} />
              <input
                type="text"
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder={buscaPlaceholder}
                className={styles.buscaInput}
                aria-label={buscaPlaceholder}
              />
            </div>
          )}
          {onNovoRegistro && (
            <button onClick={onNovoRegistro} className={styles.botaoNovo}>
              {botaoNovoTexto}
            </button>
          )}
        </div>
      </div>

      {dadosFiltrados.length === 0 ? (
        <div className={styles.vazio}>
          <p>
            {dados.length === 0
              ? mensagemVazia
              : `Nenhum resultado para "${termoBusca.trim()}"`}
          </p>
        </div>
      ) : (
        <>
        <div className={styles.tabelaContainer}>
          <table className={styles.tabela}>
            <thead>
              <tr>
                {colunas.map((coluna) => (
                  <th
                    key={String(coluna.id)}
                    style={{ width: coluna.width }}
                  >
                    {coluna.label}
                  </th>
                ))}
                {(onEditar || onExcluir || acoes) && (
                  <th className={styles.colunaAcoes}>Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {dadosPagina.map((linha, indexPagina) => {
                const index = (paginaValida - 1) * ITENS_POR_PAGINA + indexPagina;
                return (
                <tr key={index}>
                  {colunas.map((coluna) => (
                    <td key={String(coluna.id)}>
                      {coluna.render
                        ? coluna.render((linha as any)[coluna.id], linha)
                        : String((linha as any)[coluna.id] || '-')
                      }
                    </td>
                  ))}
                  {(onEditar || onExcluir || acoes) && (
                    <td className={styles.colunaAcoes}>
                      <div className={styles.acoesContainer}>
                        {acoes ? (
                          acoes(linha, index)
                        ) : (
                          <>
                            {onEditar && (
                              <button
                                onClick={() => onEditar(linha, index)}
                                className={styles.botaoEditar}
                                title="Editar"
                              >
                                ✏️
                              </button>
                            )}
                            {onExcluir && (
                              <button
                                onClick={() => onExcluir(linha, index)}
                                className={styles.botaoExcluir}
                                title="Excluir"
                              >
                                🗑️
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPaginas > 1 && (
          <div className={styles.paginacao}>
            <button
              type="button"
              className={styles.botaoPagina}
              onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
              disabled={paginaValida === 1}
            >
              ← Anterior
            </button>
            <span className={styles.paginaInfo}>
              Página {paginaValida} de {totalPaginas}
            </span>
            <button
              type="button"
              className={styles.botaoPagina}
              onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaValida === totalPaginas}
            >
              Próxima →
            </button>
          </div>
        )}
        </>
      )}
    </div>
  );
}
