'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import styles from './page.module.css';

import BaseTabelaDados, { Coluna } from '@/components/gestao-dados/BaseTabelaDados';
import { Icon } from '@/components/Icon';

import * as ApiKeyAPI from '@/lib/api/apikey.api';

const ESCOPO_LABEL: Record<ApiKeyAPI.ApiKeyEscopo, string> = {
  'usuario:leitura': 'Pessoas (leitura)',
  'turma:leitura': 'Turmas (leitura)',
  'matricula:leitura': 'Matrículas (leitura)',
  'tarefa:leitura': 'Tarefas (leitura)',
  'prova:leitura': 'Provas (leitura)',
  'aviso:leitura': 'Avisos (leitura)',
};

export default function ApiKeysPage() {
  const params = useParams();
  const escolaGUID = (params?.escolaGUID as string) || '';

  const [chaves, setChaves] = useState<ApiKeyAPI.ApiKey[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [nomeForm, setNomeForm] = useState('');
  const [escoposForm, setEscoposForm] = useState<Set<ApiKeyAPI.ApiKeyEscopo>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  const [chaveRevelada, setChaveRevelada] = useState<ApiKeyAPI.ApiKeyCreatedResultado | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (escolaGUID) carregarChaves();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [escolaGUID]);

  const carregarChaves = async () => {
    try {
      setCarregando(true);
      const resultado = await ApiKeyAPI.listarApiKeys(escolaGUID);
      setChaves(resultado.chaves);
    } catch (erro: any) {
      console.error('Erro ao carregar chaves de API:', erro);
      alert('Erro ao carregar chaves de API: ' + erro.message);
    } finally {
      setCarregando(false);
    }
  };

  const abrirModalCriar = () => {
    setNomeForm('');
    setEscoposForm(new Set());
    setErroForm('');
    setModalCriarAberto(true);
  };

  const alternarEscopo = (escopo: ApiKeyAPI.ApiKeyEscopo) => {
    setEscoposForm((atual) => {
      const novo = new Set(atual);
      if (novo.has(escopo)) novo.delete(escopo);
      else novo.add(escopo);
      return novo;
    });
  };

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroForm('');

    if (nomeForm.trim().length < 3) {
      setErroForm('Dê um nome com pelo menos 3 caracteres (ex.: "Integração Secretaria Digital").');
      return;
    }
    if (escoposForm.size === 0) {
      setErroForm('Selecione ao menos um escopo.');
      return;
    }

    try {
      setSalvando(true);
      const resultado = await ApiKeyAPI.criarApiKey({
        EscolaGUID: escolaGUID,
        ApiKeyNome: nomeForm.trim(),
        ApiKeyEscopos: Array.from(escoposForm),
      });

      setModalCriarAberto(false);
      setChaveRevelada(resultado);
      carregarChaves();
    } catch (erro: any) {
      console.error('Erro ao criar chave de API:', erro);
      setErroForm(erro.message || 'Erro ao criar chave de API');
    } finally {
      setSalvando(false);
    }
  };

  const handleRevogar = async (chave: ApiKeyAPI.ApiKey) => {
    if (!confirm(`Tem certeza que deseja revogar a chave "${chave.ApiKeyNome}"? Isso não pode ser desfeito — qualquer integração usando essa chave para de funcionar imediatamente.`)) {
      return;
    }
    try {
      await ApiKeyAPI.revogarApiKey(chave.ApiKeyGUID);
      carregarChaves();
    } catch (erro: any) {
      console.error('Erro ao revogar chave de API:', erro);
      alert('Erro ao revogar chave de API: ' + erro.message);
    }
  };

  const copiarChave = async () => {
    if (!chaveRevelada) return;
    try {
      await navigator.clipboard.writeText(chaveRevelada.chave);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sem permissão de clipboard (ex.: contexto não-seguro) — o valor já
      // está visível na tela pra cópia manual, não é um erro bloqueante.
    }
  };

  const colunas: Coluna<ApiKeyAPI.ApiKey>[] = [
    { id: 'ApiKeyNome', label: 'Nome', width: '25%' },
    {
      id: 'ApiKeyPrefixo',
      label: 'Chave',
      width: '20%',
      render: (valor: string) => <code className={styles.prefixo}>{valor}…</code>,
    },
    {
      id: 'ApiKeyEscopos',
      label: 'Escopos',
      width: '25%',
      render: (valor: ApiKeyAPI.ApiKeyEscopo[]) => (
        <span className={styles.escopos}>{valor.map((e) => ESCOPO_LABEL[e] || e).join(', ')}</span>
      ),
    },
    {
      id: 'ApiKeyStatus',
      label: 'Status',
      width: '10%',
      render: (valor: 'Ativa' | 'Revogada') => (
        <span className={valor === 'Ativa' ? styles.statusAtivo : styles.statusInativo}>{valor}</span>
      ),
    },
    {
      id: 'ApiKeyUltimoUsoEm',
      label: 'Último uso',
      width: '10%',
      render: (valor: string | null) => (valor ? new Date(valor).toLocaleDateString('pt-BR') : 'Nunca usada'),
    },
    {
      id: 'ApiKeyCreatedAt',
      label: 'Criada em',
      width: '10%',
      render: (valor: string) => new Date(valor).toLocaleDateString('pt-BR'),
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.titulo}><Icon name="lock" size={22} /> Chaves de API</h1>
          <p className={styles.subtitulo}>
            Emita chaves para integrações externas acessarem dados desta escola pela API. Cada chave só enxerga dados desta escola e só os recursos marcados no escopo dela.
          </p>
        </div>
        <div className={styles.acoes}>
          <button onClick={abrirModalCriar} className={styles.botaoNovo}>
            + Nova Chave
          </button>
        </div>
      </div>

      <BaseTabelaDados
        titulo="Chaves emitidas"
        colunas={colunas}
        dados={chaves}
        carregando={carregando}
        filtrarPor={(chave, termo) => chave.ApiKeyNome.toLowerCase().includes(termo)}
        buscaPlaceholder="Buscar por nome da chave..."
        acoes={(chave) =>
          chave.ApiKeyStatus === 'Ativa' ? (
            <button onClick={() => handleRevogar(chave)} className={styles.botaoExcluir} title="Revogar">
              <Icon name="trash" size={16} />
            </button>
          ) : null
        }
        mensagemVazia='Nenhuma chave de API emitida ainda. Clique em "Nova Chave" para criar a primeira.'
      />

      {/* Modal: Criar chave */}
      {modalCriarAberto && (
        <div className={styles.overlay} onClick={() => !salvando && setModalCriarAberto(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}>Nova Chave de API</h2>

              {erroForm && <div className={styles.erro}>{erroForm}</div>}

              <form onSubmit={handleCriar}>
                <div className={styles.campoContainer}>
                  <label htmlFor="ApiKeyNome" className={styles.label}>
                    Nome <span className={styles.obrigatorio}>*</span>
                  </label>
                  <input
                    id="ApiKeyNome"
                    type="text"
                    value={nomeForm}
                    onChange={(e) => setNomeForm(e.target.value)}
                    placeholder='Ex.: "Integração Secretaria Digital"'
                    className={styles.input}
                    disabled={salvando}
                  />
                </div>

                <div className={styles.campoContainer}>
                  <label className={styles.label}>
                    Escopos <span className={styles.obrigatorio}>*</span>
                  </label>
                  <div className={styles.escoposLista}>
                    {ApiKeyAPI.ESCOPOS_APIKEY.map((escopo) => (
                      <label key={escopo} className={styles.escopoItem}>
                        <input
                          type="checkbox"
                          checked={escoposForm.has(escopo)}
                          onChange={() => alternarEscopo(escopo)}
                          disabled={salvando}
                        />
                        {ESCOPO_LABEL[escopo]}
                      </label>
                    ))}
                  </div>
                </div>

                <div className={styles.formAcoes}>
                  <button
                    type="button"
                    onClick={() => setModalCriarAberto(false)}
                    className={styles.botaoCancelar}
                    disabled={salvando}
                  >
                    Cancelar
                  </button>
                  <button type="submit" className={styles.botaoSalvar} disabled={salvando}>
                    {salvando ? 'Criando...' : 'Criar Chave'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Segredo revelado (só aparece uma vez, logo após criar) */}
      {chaveRevelada && (
        <div className={styles.overlay}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalConteudo}>
              <h2 className={styles.modalTitulo}><Icon name="alert-triangle" size={20} /> Copie sua chave agora</h2>
              <p className={styles.avisoRevelacao}>
                Este é o único momento em que o valor completo da chave é exibido. Copie e guarde num lugar seguro — depois disso só o prefixo abaixo fica visível.
              </p>
              <div className={styles.chaveBox}>
                <code>{chaveRevelada.chave}</code>
              </div>
              <button onClick={copiarChave} className={styles.botaoCopiar}>
                {copiado ? 'Copiado!' : 'Copiar chave'}
              </button>
              <button
                onClick={() => setChaveRevelada(null)}
                className={styles.botaoFechar}
              >
                Já copiei, fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
