import React, { useState } from 'react';
import styles from './BaseTabelaDados.module.css';
import { Icon } from '@/components/Icon';

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

  const termoBuscaNormalizado = termoBusca.trim().toLowerCase();
  const dadosFiltrados = filtrarPor && termoBuscaNormalizado
    ? dados.filter((item) => filtrarPor(item, termoBuscaNormalizado))
    : dados;

  if (carregando) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.titulo}>{titulo}</h2>
        </div>
        <div className={styles.carregando}>
          <div className={styles.spinner}></div>
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
              {dadosFiltrados.map((linha, index) => (
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
