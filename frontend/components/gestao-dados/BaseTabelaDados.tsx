import React from 'react';
import styles from './BaseTabelaDados.module.css';

export interface Coluna<T = any> {
  id: keyof T;
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
  botaoNovoTexto = '+ Novo'
}: BaseTabelaDadosProps<T>) {
  
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
          {titulo} <span className={styles.contador}>({dados.length})</span>
        </h2>
        {onNovoRegistro && (
          <button onClick={onNovoRegistro} className={styles.botaoNovo}>
            {botaoNovoTexto}
          </button>
        )}
      </div>

      {dados.length === 0 ? (
        <div className={styles.vazio}>
          <p>{mensagemVazia}</p>
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
              {dados.map((linha, index) => (
                <tr key={index}>
                  {colunas.map((coluna) => (
                    <td key={String(coluna.id)}>
                      {coluna.render 
                        ? coluna.render(linha[coluna.id], linha)
                        : String(linha[coluna.id] || '-')
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
