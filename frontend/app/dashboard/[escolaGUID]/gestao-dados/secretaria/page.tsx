'use client';

/**
 * Gestão de Secretaria — vincula usuários JÁ CADASTRADOS na plataforma
 * (via /cadastro) à função Secretaria (FuncaoId=2) nesta escola.
 *
 * Diferente de professor/aluno (que criam um usuário do zero, com senha
 * temporária + e-mail de boas-vindas), aqui só existe o vínculo — o fluxo é
 * buscar por CPF (usuario.api.ts) e vincular (escolaxusuarioxfuncao.api.ts).
 * Sem gating adicional de acesso: mesmo nível do resto de Gestão de Dados.
 */

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';
import { Icon } from '@/components/Icon';

import * as VinculoAPI from '@/lib/api/escolaxusuarioxfuncao.api';
import * as UsuarioAPI from '@/lib/api/usuario.api';
import { formatarCPF, limparCPF, validarCPF } from '@/lib/validators/cpf';

const FUNCAO_ID_SECRETARIA = 2;

export default function SecretariaPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  const [vinculos, setVinculos] = useState<VinculoAPI.EscolaxUsuarioxFuncao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarInativos, setMostrarInativos] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [cpfBusca, setCpfBusca] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [erroBusca, setErroBusca] = useState('');
  const [usuarioEncontrado, setUsuarioEncontrado] = useState<UsuarioAPI.UsuarioBusca | null>(null);
  const [vinculando, setVinculando] = useState(false);

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
    setCpfBusca('');
    setErroBusca('');
    setUsuarioEncontrado(null);
  };

  const handleBuscarCPF = async () => {
    const cpfLimpo = limparCPF(cpfBusca);
    if (!validarCPF(cpfLimpo)) {
      setErroBusca('CPF inválido. Confira os números digitados.');
      return;
    }
    try {
      setBuscando(true);
      setErroBusca('');
      setUsuarioEncontrado(null);
      const usuarioEntrado = await UsuarioAPI.buscarUsuarioPorCPF(cpfLimpo);
      setUsuarioEncontrado(usuarioEntrado);
    } catch (erro: any) {
      console.error('Erro ao buscar usuário por CPF:', erro);
      setErroBusca(
        erro.message || 'Usuário não encontrado. Peça para a pessoa se cadastrar em /cadastro primeiro.'
      );
    } finally {
      setBuscando(false);
    }
  };

  const handleConfirmarVinculo = async () => {
    if (!usuarioEncontrado) return;
    try {
      setVinculando(true);
      await VinculoAPI.criarVinculo({
        UsuarioCPF: usuarioEncontrado.UsuarioCPF,
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
    { id: 'UsuarioCPF', label: 'CPF', width: '25%', render: (valor: any) => formatarCPF(valor) },
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
          vinculo.UsuarioCPF.includes(termo.replace(/\D/g, ''))
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
        <div className={styles.overlay} onClick={fecharModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Adicionar à Secretaria</h2>
              <p className={styles.subtitulo}>
                Busque por CPF um usuário que já tenha se cadastrado na plataforma.
              </p>

              <div className={styles.campoBusca}>
                <input
                  type="text"
                  value={cpfBusca}
                  onChange={(e) => setCpfBusca(formatarCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className={styles.inputBusca}
                  maxLength={14}
                  aria-label="CPF do usuário"
                />
                <button onClick={handleBuscarCPF} disabled={buscando} className={styles.botaoBuscar}>
                  {buscando ? 'Buscando...' : (
                    <>
                      <Icon name="search" size={16} /> Buscar
                    </>
                  )}
                </button>
              </div>

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
                </div>
              )}

              <button onClick={fecharModal} className={styles.botaoCancelar}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
