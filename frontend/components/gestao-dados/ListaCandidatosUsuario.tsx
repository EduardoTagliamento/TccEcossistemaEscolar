'use client';

import { formatarCPF } from '@/lib/validators/cpf';
import { UsuarioBusca } from '@/lib/api/usuario.api';
import { Icon } from '@/components/Icon';
import styles from './ListaCandidatosUsuario.module.css';

interface ListaCandidatosUsuarioProps {
  candidatos: UsuarioBusca[];
  buscando: boolean;
  termo: string;
  onSelecionar: (usuario: UsuarioBusca) => void;
}

/**
 * Dropdown de candidatos encontrados numa busca por nome — usado nas 4
 * telas de Gestão de Dados (Professores/Alunos/Secretaria/Coordenação) no
 * lugar da antiga busca exata por CPF, já que nome não é único e pode
 * retornar 0, 1 ou N pessoas (ver useBuscaUsuarioPorNome).
 */
export default function ListaCandidatosUsuario({
  candidatos,
  buscando,
  termo,
  onSelecionar,
}: ListaCandidatosUsuarioProps) {
  if (termo.trim().length < 3) return null;

  if (buscando) {
    return <p className={styles.status}>Buscando...</p>;
  }

  if (candidatos.length === 0) {
    return (
      <p className={styles.status}>
        <Icon name="help-circle" size={14} /> Nenhum usuário encontrado com esse nome — ao salvar, uma conta nova será criada.
      </p>
    );
  }

  return (
    <ul className={styles.lista}>
      {candidatos.map((usuario) => (
        <li key={usuario.UsuarioGUID}>
          <button
            type="button"
            className={styles.item}
            onClick={() => onSelecionar(usuario)}
          >
            <span className={styles.nome}>{usuario.UsuarioNome}</span>
            <span className={styles.detalhes}>
              {usuario.UsuarioEmail && <span>{usuario.UsuarioEmail}</span>}
              {usuario.UsuarioCPF && <span>CPF: {formatarCPF(usuario.UsuarioCPF)}</span>}
              {!usuario.UsuarioEmail && !usuario.UsuarioCPF && <span>Sem email ou CPF cadastrado</span>}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
