import React, { useState } from 'react';
import styles from './ModalResolverErros.module.css';

export type TipoErro = 
  | 'nao_encontrado'
  | 'ambiguo'
  | 'invalido'
  | 'vazio'
  | 'boolean_invalido'
  | 'multiplos_itens';

export interface ErroImportacao {
  linha: number;
  tipo: TipoErro;
  campo: string;
  valorOriginal: string;
  mensagem: string;
  contexto: {
    dadosLinha: any;
    opcoesDisponiveis?: Array<{ valor: string; label: string; detalhes?: string }>;
    tipoEsperado?: string;
    mascara?: string;
  };
}

interface ModalResolverErrosProps {
  erros: ErroImportacao[];
  erroAtual: number;
  onResolverErro: (resolucao: ResolucaoErro) => void;
  onPularErro: () => void;
  onCancelar: () => void;
}

export interface ResolucaoErro {
  indiceErro: number;
  acao: 'corrigir' | 'pular' | 'remover' | 'criar_novo';
  novoValor?: any;
}

export default function ModalResolverErros({
  erros,
  erroAtual,
  onResolverErro,
  onPularErro,
  onCancelar
}: ModalResolverErrosProps) {
  const [valorCorrecao, setValorCorrecao] = useState<string>('');
  const [opcaoSelecionada, setOpcaoSelecionada] = useState<string>('');

  const erro = erros[erroAtual];
  const progresso = ((erroAtual + 1) / erros.length) * 100;

  const handleResolver = () => {
    let novoValor: any = valorCorrecao || opcaoSelecionada;

    // Para campos booleanos
    if (erro.tipo === 'boolean_invalido') {
      novoValor = opcaoSelecionada === 'true' || opcaoSelecionada === 'Sim' || opcaoSelecionada === '1';
    }

    onResolverErro({
      indiceErro: erroAtual,
      acao: 'corrigir',
      novoValor
    });

    // Resetar estado
    setValorCorrecao('');
    setOpcaoSelecionada('');
  };

  const renderConteudoErro = () => {
    switch (erro.tipo) {
      case 'nao_encontrado':
        return (
          <div className={styles.conteudoErro}>
            <p className={styles.descricaoErro}>
              O valor <strong>"{erro.valorOriginal}"</strong> não foi encontrado.
            </p>
            
            {erro.contexto.opcoesDisponiveis && erro.contexto.opcoesDisponiveis.length > 0 && (
              <>
                <p className={styles.instrucao}>Selecione a opção correta:</p>
                <div className={styles.inputContainer}>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className={styles.inputBusca}
                    onChange={(e) => {
                      const busca = e.target.value.toLowerCase();
                      // Filtrar visualmente (implementar lógica de filtro se necessário)
                    }}
                  />
                  <select
                    value={opcaoSelecionada}
                    onChange={(e) => setOpcaoSelecionada(e.target.value)}
                    className={styles.select}
                    size={5}
                  >
                    {erro.contexto.opcoesDisponiveis.map((opcao, idx) => (
                      <option key={idx} value={opcao.valor}>
                        {opcao.label} {opcao.detalhes && `- ${opcao.detalhes}`}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>
        );

      case 'ambiguo':
        return (
          <div className={styles.conteudoErro}>
            <p className={styles.descricaoErro}>
              Encontramos múltiplas opções para <strong>"{erro.valorOriginal}"</strong>.
            </p>
            <p className={styles.instrucao}>Escolha a opção correta:</p>
            
            <div className={styles.listaOpcoes}>
              {erro.contexto.opcoesDisponiveis?.map((opcao, idx) => (
                <label key={idx} className={styles.opcaoRadio}>
                  <input
                    type="radio"
                    name="opcao"
                    value={opcao.valor}
                    checked={opcaoSelecionada === opcao.valor}
                    onChange={(e) => setOpcaoSelecionada(e.target.value)}
                  />
                  <div className={styles.opcaoConteudo}>
                    <strong>{opcao.label}</strong>
                    {opcao.detalhes && (
                      <span className={styles.detalhes}>{opcao.detalhes}</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        );

      case 'vazio':
        return (
          <div className={styles.conteudoErro}>
            <p className={styles.descricaoErro}>
              O campo <strong>{erro.campo}</strong> está vazio e é obrigatório.
            </p>
            <p className={styles.instrucao}>Digite o valor correto:</p>
            
            <input
              type="text"
              value={valorCorrecao}
              onChange={(e) => setValorCorrecao(e.target.value)}
              placeholder={`Digite o ${erro.campo}...`}
              className={styles.input}
              autoFocus
            />
          </div>
        );

      case 'invalido':
        return (
          <div className={styles.conteudoErro}>
            <p className={styles.descricaoErro}>
              O valor <strong>"{erro.valorOriginal}"</strong> é inválido para o campo{' '}
              <strong>{erro.campo}</strong>.
            </p>
            <p className={styles.instrucao}>
              Digite o valor no formato correto
              {erro.contexto.mascara && `: ${erro.contexto.mascara}`}:
            </p>
            
            <input
              type="text"
              value={valorCorrecao}
              onChange={(e) => setValorCorrecao(e.target.value)}
              placeholder={erro.contexto.mascara || `Digite o ${erro.campo}...`}
              className={styles.input}
              autoFocus
            />
          </div>
        );

      case 'boolean_invalido':
        return (
          <div className={styles.conteudoErro}>
            <p className={styles.descricaoErro}>
              O valor <strong>"{erro.valorOriginal}"</strong> não é válido para um campo Sim/Não.
            </p>
            <p className={styles.instrucao}>Selecione a opção correta:</p>
            
            <div className={styles.opcoesBoolean}>
              <label className={styles.opcaoRadio}>
                <input
                  type="radio"
                  name="boolean"
                  value="true"
                  checked={opcaoSelecionada === 'true'}
                  onChange={(e) => setOpcaoSelecionada(e.target.value)}
                />
                <span>Sim</span>
              </label>
              <label className={styles.opcaoRadio}>
                <input
                  type="radio"
                  name="boolean"
                  value="false"
                  checked={opcaoSelecionada === 'false'}
                  onChange={(e) => setOpcaoSelecionada(e.target.value)}
                />
                <span>Não</span>
              </label>
            </div>
            
            <p className={styles.dica}>
              💡 Valores aceitos: Sim/Não, S/N, 1/0, V/F, True/False
            </p>
          </div>
        );

      default:
        return (
          <div className={styles.conteudoErro}>
            <p className={styles.descricaoErro}>{erro.mensagem}</p>
          </div>
        );
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.titulo}>Resolver Erro - Linha {erro.linha}</h2>
          <button onClick={onCancelar} className={styles.botaoFechar}>
            ✕
          </button>
        </div>

        {/* Progresso */}
        <div className={styles.progressoContainer}>
          <div className={styles.progressoInfo}>
            <span>Erro {erroAtual + 1} de {erros.length}</span>
            <span>{Math.round(progresso)}%</span>
          </div>
          <div className={styles.progressoBarra}>
            <div 
              className={styles.progressoPreenchimento}
              style={{ width: `${progresso}%` }}
            />
          </div>
        </div>

        {/* Conteúdo do Erro */}
        <div className={styles.corpo}>
          <div className={styles.infoCampo}>
            <span className={styles.labelCampo}>Campo:</span>
            <strong>{erro.campo}</strong>
          </div>
          
          {renderConteudoErro()}
        </div>

        {/* Ações */}
        <div className={styles.acoes}>
          <button
            onClick={onPularErro}
            className={styles.botaoPular}
          >
            ⏩ Pular
          </button>
          <button
            onClick={handleResolver}
            className={styles.botaoResolver}
            disabled={!valorCorrecao && !opcaoSelecionada}
          >
            ✅ Resolver e Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
