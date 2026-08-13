'use client';

/**
 * Gestão de Secretaria — vincula usuários JÁ CADASTRADOS na plataforma
 * (via /cadastro) à função Secretaria (FuncaoId=2) nesta escola.
 *
 * Diferente de professor/aluno (que criam um usuário do zero, com senha
 * temporária + e-mail de boas-vindas), aqui só existe o vínculo — o fluxo é
 * buscar por nome (usuario.api.ts) e vincular (escolaxusuarioxfuncao.api.ts).
 * CPF virou opcional (ver docs/PLANO_MIGRACAO_USUARIO_PK_GUID.md), nome é o
 * identificador de busca. Sem gating adicional de acesso: mesmo nível do
 * resto de Gestão de Dados.
 */

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';
import BaseUploadPlanilha, { DadosPlanilha } from '@/components/gestao-dados/BaseUploadPlanilha';
import ListaCandidatosUsuario from '@/components/gestao-dados/ListaCandidatosUsuario';
import { Icon } from '@/components/Icon';

import * as VinculoAPI from '@/lib/api/escolaxusuarioxfuncao.api';
import { UsuarioBusca } from '@/lib/api/usuario.api';
import { useBuscaUsuarioPorNome } from '@/lib/usuario/useBuscaUsuarioPorNome';
import { formatarCPF } from '@/lib/validators/cpf';

const FUNCAO_ID_SECRETARIA = 2;

export default function SecretariaPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  const [vinculos, setVinculos] = useState<VinculoAPI.EscolaxUsuarioxFuncao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [nomeBusca, setNomeBusca] = useState('');
  const [erroBusca, setErroBusca] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<UsuarioBusca | null>(null);
  const [vinculando, setVinculando] = useState(false);
  const { candidatos, buscando, limpar: limparBuscaNome } = useBuscaUsuarioPorNome(
    usuarioEncontrado ? '' : nomeBusca
  );

  // Modal: importar via planilha
  const [modalUploadAberto, setModalUploadAberto] = useState(false);
  const [dadosImportados, setDadosImportados] = useState<DadosPlanilha<any> | null>(null);
  const [processandoBatch, setProcessandoBatch] = useState(false);
  const [resultadoBatch, setResultadoBatch] = useState<VinculoAPI.VinculoBatchCreateResponse | null>(null);

  useEffect(() => {
    if (escolaGUID) {
      carregarVinculos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaGUID]);

  const carregarVinculos = async () => {
    try {
      setCarregando(true);
      const lista = await VinculoAPI.listarVinculos({ EscolaGUID: escolaGUID, FuncaoId: FUNCAO_ID_SECRETARIA });
      setVinculos(lista);
    } catch (erro: any) {
      console.error('Erro ao carregar equipe de secretaria:', erro);
      alert('Erro ao carregar equipe de secretaria: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const vinculosExibidos = useMemo(
    () => vinculos.filter((vinculo) => (mostrarInativos ? vinculo.Status !== 'Ativo' : vinculo.Status === 'Ativo')),
    [vinculos, mostrarInativos]
  );

  const fecharModal = () => {
    setModalAberto(false);
    setNomeBusca('');
    setErroBusca('');
    setUsuarioEncontrado(null);
    limparBuscaNome();
  };

  const handleSelecionarCandidato = (encontrado: UsuarioBusca) => {
    setErroBusca('');
    setUsuarioEncontrado(encontrado);
  };

  const handleConfirmarVinculo = async () => {
    if (!usuarioEncontrado) return;
    try {
      setVinculando(true);
      await VinculoAPI.criarVinculo({
        UsuarioGUID: usuarioEncontrado.UsuarioGUID,
        EscolaGUID: escolaGUID,
        FuncaoId: FUNCAO_ID_SECRETARIA,
      });
      alert(`${usuarioEncontrado.UsuarioNome} agora faz parte da Secretaria.`);
      fecharModal();
      carregarVinculos();
    } catch (erro: any) {
      console.error('Erro ao vincular usuário à Secretaria:', erro);
      setErroBusca(erro.message || 'Erro ao vincular usuário à Secretaria.');
    } finally {
      setVinculando(false);
    }
  };

  // ===== Importar via planilha =====
  const fecharModalUpload = () => {
    setModalUploadAberto(false);
    setDadosImportados(null);
    setResultadoBatch(null);
  };

  const handleDadosCarregados = (dados: DadosPlanilha<any>) => {
    setDadosImportados(dados);
  };

  const extrairItem = (linha: any): VinculoAPI.VinculoEmMassaItem => ({
    CPF: (linha['CPF'] || linha.UsuarioCPF || linha.cpf || '').toString().trim() || undefined,
    Nome: (linha['Nome Completo'] || linha.Nome || linha.nome || '').toString().trim() || undefined,
    Email: (linha['Email'] || linha.email || '').toString().trim() || undefined,
  });

  const handleSalvarImportados = async () => {
    if (!dadosImportados) return;
    try {
      setProcessandoBatch(true);
      // Nome é o identificador de resolução agora — CPF é opcional, só serve
      // de desempate extra quando presente.
      const itens = dadosImportados.dados.map(extrairItem).filter((item) => !!item.CPF || !!item.Nome);

      const resultado = await VinculoAPI.criarVinculosEmMassa({
        EscolaGUID: escolaGUID,
        FuncaoId: FUNCAO_ID_SECRETARIA,
        itens,
      });

      setResultadoBatch(resultado);
      setDadosImportados(null);
      carregarVinculos();
    } catch (erro: any) {
      console.error('Erro ao importar planilha da Secretaria:', erro);
      alert('Erro ao importar planilha: ' + erro.message);
    } finally {
      setProcessandoBatch(false);
    }
  };

  const handleRemover = async (vinculo: VinculoAPI.EscolaxUsuarioxFuncao) => {
    if (!confirm(`Remover ${vinculo.UsuarioNome || vinculo.UsuarioCPF} da Secretaria?`)) return;
    try {
      await VinculoAPI.atualizarVinculo(vinculo.EscolaxUsuarioxFuncaoId, {
        Status: 'Inativo',
        DataFim: new Date().toISOString().split('T')[0],
      });
      alert('Removido(a) da Secretaria com sucesso.');
      carregarVinculos();
    } catch (erro: any) {
      console.error('Erro ao remover vínculo de Secretaria:', erro);
      alert('Erro ao remover: ' + erro.message);
    }
  };

  const handleReativar = async (vinculo: VinculoAPI.EscolaxUsuarioxFuncao) => {
    if (!confirm(`Reativar ${vinculo.UsuarioNome || vinculo.UsuarioCPF} na Secretaria?`)) return;
    try {
      await VinculoAPI.atualizarVinculo(vinculo.EscolaxUsuarioxFuncaoId, {
        Status: 'Ativo',
        DataFim: null,
      });
      alert('Vínculo reativado com sucesso.');
      carregarVinculos();
    } catch (erro: any) {
      console.error('Erro ao reativar vínculo de Secretaria:', erro);
      alert('Erro ao reativar: ' + erro.message);
    }
  };

  const colunas: Coluna<VinculoAPI.EscolaxUsuarioxFuncao>[] = [
    { id: 'UsuarioNome', label: 'Nome', width: '40%', render: (valor: any) => valor || '-' },
    { id: 'UsuarioCPF', label: 'CPF', width: '25%', render: (valor: any) => (valor ? formatarCPF(valor) : '—') },
    {
      id: 'Status',
      label: 'Status',
      width: '15%',
      render: (valor: any) => (
        <span
          className={
            valor === 'Ativo' ? styles.statusAtivo : valor === 'Inativo' ? styles.statusInativo : styles.statusEncerrado
          }
        >
          {valor}
        </span>
      ),
    },
    {
      id: 'DataInicio',
      label: 'Desde',
      width: '20%',
      render: (valor: any) => (valor ? new Date(valor).toLocaleDateString('pt-BR') : '-'),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}>
            <Icon name="file-text" size={22} /> Gestão de Secretaria
          </h1>
          <p className={styles.subtitulo}>Gerencie a equipe de secretaria da escola</p>
        </div>
        <div className={styles.acoes}>
          <button onClick={() => setMostrarInativos((v) => !v)} className={styles.botaoUpload}>
            {mostrarInativos ? 'Ver ativos' : 'Ver histórico (inativos)'}
          </button>
          <button onClick={() => setModalUploadAberto(true)} className={styles.botaoUpload}>
            <Icon name="upload" size={16} /> Importar Planilha
          </button>
          <button onClick={() => setModalAberto(true)} className={styles.botaoNovo}>
            <Icon name="plus" size={16} /> Adicionar à Secretaria
          </button>
        </div>
      </div>

      <BaseTabelaDados
        titulo="Equipe de Secretaria"
        colunas={colunas}
        dados={vinculosExibidos}
        carregando={carregando}
        filtrarPor={(vinculo, termo) =>
          (vinculo.UsuarioNome || '').toLowerCase().includes(termo) ||
          (vinculo.UsuarioCPF || '').includes(termo.replace(/\D/g, ''))
        }
        buscaPlaceholder="Buscar por nome ou CPF..."
        acoes={(vinculo) =>
          vinculo.Status === 'Ativo' ? (
            <button onClick={() => handleRemover(vinculo)} className={styles.botaoExcluir} title="Remover">
              <Icon name="trash" size={16} />
            </button>
          ) : (
            <button onClick={() => handleReativar(vinculo)} className={styles.botaoReativar} title="Reativar">
              <Icon name="check" size={16} />
            </button>
          )
        }
        mensagemVazia={
          mostrarInativos
            ? 'Nenhum vínculo inativo encontrado.'
            : "Nenhum integrante da Secretaria cadastrado. Clique em 'Adicionar à Secretaria'."
        }
      />

      {modalAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Adicionar à Secretaria</h2>
              <p className={styles.subtitulo}>
                Busque pelo nome um usuário que já tenha se cadastrado na plataforma.
              </p>

              {!usuarioEncontrado && (
                <div className={styles.campoBusca}>
                  <input
                    type="text"
                    value={nomeBusca}
                    onChange={(e) => setNomeBusca(e.target.value)}
                    placeholder="Nome completo"
                    className={styles.inputBusca}
                    aria-label="Nome do usuário"
                  />
                </div>
              )}

              {!usuarioEncontrado && (
                <ListaCandidatosUsuario
                  termo={nomeBusca}
                  candidatos={candidatos}
                  buscando={buscando}
                  onSelecionar={handleSelecionarCandidato}
                />
              )}

              {erroBusca && <div className={styles.erro}>{erroBusca}</div>}

              {usuarioEncontrado && (
                <div className={styles.usuarioEncontrado}>
                  <p className={styles.usuarioEncontradoNome}>
                    <Icon name="check-circle" size={18} /> {usuarioEncontrado.UsuarioNome}
                  </p>
                  <p className={styles.usuarioEncontradoDetalhe}>
                    {usuarioEncontrado.UsuarioEmail || 'sem e-mail cadastrado'}
                  </p>
                  <button onClick={handleConfirmarVinculo} disabled={vinculando} className={styles.botaoImportar}>
                    {vinculando ? 'Vinculando...' : 'Confirmar e vincular à Secretaria'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUsuarioEncontrado(null);
                      setNomeBusca('');
                    }}
                    className={styles.botaoCancelar}
                  >
                    Buscar outra pessoa
                  </button>
                </div>
              )}

              <button onClick={fecharModal} className={styles.botaoCancelar}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Importar via Planilha */}
      {modalUploadAberto && (
        <div className={styles.overlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Importar Secretaria via Planilha</h2>

              {!resultadoBatch && (
                <BaseUploadPlanilha
                  titulo="Upload de Planilha"
                  subtitulo="Nome Completo, CPF (opcional) e Email. Cada pessoa é resolvida por nome — se já existir na plataforma, só é vinculada; se não existir, a conta é criada automaticamente e a pessoa recebe um e-mail com a senha temporária. CPF ajuda a desempatar nomes repetidos."
                  modeloUrl="/modelos/modelo-secretaria.xlsx"
                  onDadosCarregados={handleDadosCarregados}
                  onErro={(erro) => alert(erro)}
                  colunasEsperadas={['Nome Completo']}
                />
              )}

              {dadosImportados && (
                <div className={styles.previewContainer}>
                  <h3 className={styles.previewTitulo}>
                    <Icon name="file-text" size={18} /> Preview - {dadosImportados.dados.length} linhas encontradas
                  </h3>
                  <div className={styles.previewLista}>
                    {dadosImportados.dados.slice(0, 5).map((linha: any, idx: number) => {
                      const item = extrairItem(linha);
                      return (
                        <div key={idx} className={styles.previewItem}>
                          <Icon name="check" size={14} /> {item.Nome || '(nome não informado)'}{item.CPF ? ` — CPF: ${formatarCPF(item.CPF)}` : ''}
                        </div>
                      );
                    })}
                    {dadosImportados.dados.length > 5 && (
                      <div className={styles.previewMais}>
                        + {dadosImportados.dados.length - 5} linhas...
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleSalvarImportados}
                    disabled={processandoBatch}
                    className={styles.botaoImportar}
                  >
                    {processandoBatch ? 'Processando...' : (<><Icon name="check" size={16} /> Vincular Todos</>)}
                  </button>
                </div>
              )}

              {resultadoBatch && (
                <div className={styles.resultadoContainer}>
                  <h3 className={styles.resultadoTitulo}><Icon name="check-circle" size={20} /> Processamento Concluído</h3>
                  <div className={styles.resultadoStats}>
                    <div className={styles.stat}>
                      <span className={styles.statNumero}>{resultadoBatch.criados}</span>
                      <span className={styles.statLabel}>Vinculados</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNumero}>{resultadoBatch.duplicados}</span>
                      <span className={styles.statLabel}>Já vinculados</span>
                    </div>
                    <div className={styles.stat}>
                      <span className={styles.statNumero}>{resultadoBatch.erros}</span>
                      <span className={styles.statLabel}>Erros</span>
                    </div>
                  </div>
                  {resultadoBatch.resultados.some((r) => r.contaCriada) && (
                    <p className={styles.subtitulo} style={{ textAlign: 'center', marginBottom: '1rem' }}>
                      {resultadoBatch.resultados.filter((r) => r.contaCriada).length} conta(s) nova(s) criada(s) — e-mail com senha temporária enviado para quem tinha e-mail informado na planilha.
                    </p>
                  )}
                  <button onClick={fecharModalUpload} className={styles.botaoFechar}>
                    Fechar
                  </button>
                </div>
              )}

              {!resultadoBatch && (
                <button onClick={fecharModalUpload} className={styles.botaoCancelar}>
                  Cancelar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
