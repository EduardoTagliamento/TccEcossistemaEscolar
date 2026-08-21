/**
 * Resolução de permissões granulares por membro (chat, grupo de tarefa,
 * grupo de projeto) — primeiro sistema de permissão granular do projeto
 * (todo o resto do código usa um enum de papel único: MembroFuncao,
 * FuncaoId). O valor explícito salvo em `MembroPermissoes` (coluna JSON)
 * sempre vence; a ausência da chave cai no default do papel do usuário.
 */

export type MapaPermissoes = Record<string, boolean> | null | undefined;

/** Núcleo compartilhado: valor explícito no JSON sempre vence; ausência cai no default do papel. */
export function resolverComOverride(mapa: MapaPermissoes, chave: string, valorDefault: boolean): boolean {
  const explicito = mapa ? mapa[chave] : undefined;
  return typeof explicito === 'boolean' ? explicito : valorDefault;
}

/**
 * GrupoProjeto/GrupoTarefa: o líder vive fora da tabela pivot (nunca tem
 * linha em usuarioxgrupoprojeto/usuarioxgrupotarefa) — líder sempre pode;
 * membro comum só se explicitamente marcado true no JSON (sem default de
 * papel pra não-líder).
 */
export function resolverPermissaoGrupoComLiderUnico(
  usuarioGUID: string,
  liderGUID: string,
  membroPermissoes: MapaPermissoes,
  capacidade: string
): boolean {
  if (usuarioGUID === liderGUID) return true;
  return resolverComOverride(membroPermissoes, capacidade, false);
}

/**
 * Chat (Turma/Tarefa): o default por papel é assimétrico hoje (ver
 * mensagem.service.ts#deletarMensagem) — preservado como default; o JSON
 * pode estender a capacidade a qualquer membro.
 */
export function resolverPermissaoChat(
  membroFuncao: 'Membro' | 'Lider' | 'Representante' | 'Vice-Representante' | null,
  membroPermissoes: MapaPermissoes,
  grupoTipo: 'Turma' | 'Tarefa',
  capacidade: 'PodeExcluirMensagens' | 'PodePersonalizarGrupo'
): boolean {
  const defaultPorPapel = grupoTipo === 'Tarefa'
    ? membroFuncao === 'Lider'
    : (membroFuncao === 'Representante' || membroFuncao === 'Vice-Representante');
  return resolverComOverride(membroPermissoes, capacidade, defaultPorPapel);
}
