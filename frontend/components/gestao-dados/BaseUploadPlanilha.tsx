import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import styles from './BaseUploadPlanilha.module.css';

export interface DadosPlanilha<T = any> {
  dados: T[];
  colunas: string[];
  arquivo: string;
}

interface BaseUploadPlanilhaProps<T = any> {
  titulo: string;
  subtitulo?: string;
  modeloUrl?: string; // URL para baixar modelo da planilha
  onDadosCarregados: (dados: DadosPlanilha<T>) => void;
  onErro?: (erro: string) => void;
  validarDados?: (dados: T[]) => { validos: T[]; erros: string[] };
  colunasEsperadas?: string[]; // Para validar se as colunas estão corretas
}

export default function BaseUploadPlanilha<T = any>({
  titulo,
  subtitulo,
  modeloUrl,
  onDadosCarregados,
  onErro,
  validarDados,
  colunasEsperadas
}: BaseUploadPlanilhaProps<T>) {
  const [carregando, setCarregando] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState<string | null>(null);

  const processarArquivo = useCallback(async (arquivo: File) => {
    setCarregando(true);
    setNomeArquivo(arquivo.name);

    try {
      const buffer = await arquivo.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      // Pegar primeira planilha
      const primeiraPlanilha = workbook.Sheets[workbook.SheetNames[0]];
      
      // Converter para JSON
      const dados = XLSX.utils.sheet_to_json<T>(primeiraPlanilha);
      
      if (dados.length === 0) {
        throw new Error('Planilha vazia. Adicione pelo menos uma linha de dados.');
      }

      // Pegar colunas (header)
      const colunas = Object.keys(dados[0] as any);

      // Validar colunas esperadas (se fornecidas)
      if (colunasEsperadas && colunasEsperadas.length > 0) {
        const colunasFaltantes = colunasEsperadas.filter(
          col => !colunas.includes(col)
        );
        
        if (colunasFaltantes.length > 0) {
          throw new Error(
            `Colunas faltantes na planilha: ${colunasFaltantes.join(', ')}`
          );
        }
      }

      // Validar dados (se fornecida função de validação)
      if (validarDados) {
        const { validos, erros } = validarDados(dados);
        
        if (erros.length > 0) {
          onErro?.(erros.join('\n'));
        }
        
        onDadosCarregados({
          dados: validos,
          colunas,
          arquivo: arquivo.name
        });
      } else {
        onDadosCarregados({
          dados,
          colunas,
          arquivo: arquivo.name
        });
      }

    } catch (erro: any) {
      const mensagem = erro.message || 'Erro ao processar planilha';
      onErro?.(mensagem);
      console.error('Erro ao processar planilha:', erro);
    } finally {
      setCarregando(false);
    }
  }, [onDadosCarregados, onErro, validarDados, colunasEsperadas]);

  const onDrop = useCallback((arquivosAceitos: File[]) => {
    if (arquivosAceitos.length > 0) {
      processarArquivo(arquivosAceitos[0]);
    }
  }, [processarArquivo]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: carregando
  });

  return (
    <div className={styles.container}>
      <h2 className={styles.titulo}>{titulo}</h2>
      {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}

      {modeloUrl && (
        <div className={styles.modeloContainer}>
          <a 
            href={modeloUrl} 
            download 
            className={styles.botaoModelo}
          >
            📥 Baixar Modelo da Planilha
          </a>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''} ${carregando ? styles.dropzoneDisabled : ''}`}
      >
        <input {...getInputProps()} />
        
        {carregando ? (
          <div className={styles.carregando}>
            <div className={styles.spinner}></div>
            <p>Processando planilha...</p>
          </div>
        ) : isDragActive ? (
          <p>📂 Solte o arquivo aqui...</p>
        ) : (
          <div className={styles.dropzoneConteudo}>
            <div className={styles.iconeUpload}>📊</div>
            <p><strong>Arraste um arquivo Excel aqui</strong></p>
            <p className={styles.textoSecundario}>ou clique para selecionar</p>
            <p className={styles.textoFormato}>Formatos aceitos: .xlsx, .xls</p>
          </div>
        )}
      </div>

      {nomeArquivo && !carregando && (
        <div className={styles.arquivoSelecionado}>
          ✅ Arquivo carregado: <strong>{nomeArquivo}</strong>
        </div>
      )}
    </div>
  );
}
