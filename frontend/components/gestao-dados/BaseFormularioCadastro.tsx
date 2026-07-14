import React from 'react';
import styles from './BaseFormularioCadastro.module.css';

export interface CampoFormulario {
  id: string;
  label: string;
  tipo: 'text' | 'email' | 'tel' | 'date' | 'select' | 'checkbox' | 'cpf' | 'number';
  obrigatorio?: boolean;
  placeholder?: string;
  opcoes?: { valor: string; label: string }[]; // Para campos tipo 'select'
  mascara?: string; // Para campos tipo 'cpf', 'tel', etc
}

interface BaseFormularioCadastroProps {
  titulo: string;
  campos: CampoFormulario[];
  valores: Record<string, any>;
  onChange: (campo: string, valor: any) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  loading?: boolean;
  erro?: string;
  botaoTexto?: string;
}

export default function BaseFormularioCadastro({
  titulo,
  campos,
  valores,
  onChange,
  onSubmit,
  onCancel,
  loading = false,
  erro,
  botaoTexto = 'Salvar'
}: BaseFormularioCadastroProps) {
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    const camposVazios = campos
      .filter(c => c.obrigatorio && !valores[c.id])
      .map(c => c.label);
    
    if (camposVazios.length > 0) {
      alert(`Campos obrigatórios não preenchidos: ${camposVazios.join(', ')}`);
      return;
    }
    
    onSubmit();
  };

  const renderCampo = (campo: CampoFormulario) => {
    const valor = valores[campo.id] || '';

    switch (campo.tipo) {
      case 'select':
        return (
          <select
            id={campo.id}
            value={valor}
            onChange={(e) => onChange(campo.id, e.target.value)}
            required={campo.obrigatorio}
            className={styles.input}
          >
            <option value="">Selecione...</option>
            {campo.opcoes?.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <input
            type="checkbox"
            id={campo.id}
            checked={!!valor}
            onChange={(e) => onChange(campo.id, e.target.checked)}
            className={styles.checkbox}
          />
        );

      default:
        return (
          <input
            type={campo.tipo === 'cpf' ? 'text' : campo.tipo}
            id={campo.id}
            value={valor}
            onChange={(e) => onChange(campo.id, e.target.value)}
            placeholder={campo.placeholder}
            required={campo.obrigatorio}
            className={styles.input}
          />
        );
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.titulo}>{titulo}</h2>
      
      {erro && <div className={styles.erro}>{erro}</div>}
      
      <form onSubmit={handleSubmit} className={styles.formulario}>
        {campos.map((campo) => (
          <div key={campo.id} className={styles.campoContainer}>
            <label htmlFor={campo.id} className={styles.label}>
              {campo.label}
              {campo.obrigatorio && <span className={styles.obrigatorio}>*</span>}
            </label>
            {renderCampo(campo)}
          </div>
        ))}

        <div className={styles.acoes}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className={styles.botaoCancelar}
              disabled={loading}
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            className={styles.botaoSalvar}
            disabled={loading}
          >
            {loading ? 'Salvando...' : botaoTexto}
          </button>
        </div>
      </form>
    </div>
  );
}
