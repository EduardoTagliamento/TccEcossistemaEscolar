/**
 * Utilitários para conversão de timezone
 * 
 * Convenção do sistema:
 * - Banco de dados: SEMPRE em GMT-3 (America/Sao_Paulo)
 * - Frontend: Detecta timezone do usuário e converte automaticamente
 */

const BRASIL_TIMEZONE = 'America/Sao_Paulo'; // GMT-3

/**
 * Detecta o timezone do navegador do usuário
 */
export function getUsuarioTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Converte data do timezone do usuário para GMT-3 (Brasil)
 * Usado antes de enviar para o backend
 * 
 * @param dataLocal Data/hora no timezone do usuário (do input datetime-local)
 * @returns String no formato "YYYY-MM-DDTHH:mm:ss" em GMT-3
 */
export function converterParaBrasil(dataLocal: string): string {
  // Parse da data como sendo no timezone do usuário
  const data = new Date(dataLocal);
  
  // Criar formatter para GMT-3
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRASIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Obter as partes da data em GMT-3
  const partes = formatter.formatToParts(data);
  const valores: Record<string, string> = {};
  partes.forEach(parte => {
    if (parte.type !== 'literal') {
      valores[parte.type] = parte.value;
    }
  });

  // Montar string no formato ISO sem timezone
  return `${valores.year}-${valores.month}-${valores.day}T${valores.hour}:${valores.minute}:${valores.second}`;
}

/**
 * Converte data do banco (GMT-3) para o timezone do usuário
 * Usado ao exibir datas vindas do backend
 * 
 * @param dataGMT3 Data em GMT-3 vinda do banco (formato ISO ou string)
 * @returns String no formato "YYYY-MM-DDTHH:mm" para input datetime-local
 */
export function converterDoBrasil(dataGMT3: string | Date): string {
  // Parse da data assumindo que está em GMT-3
  let data: Date;
  
  if (typeof dataGMT3 === 'string') {
    // Se vier "2026-05-20T15:00:00" (sem timezone), adicionar GMT-3
    if (!dataGMT3.includes('Z') && !dataGMT3.includes('+') && !dataGMT3.includes('-', 10)) {
      data = new Date(dataGMT3 + '-03:00');
    } else {
      data = new Date(dataGMT3);
    }
  } else {
    data = dataGMT3;
  }

  // Formatar para o timezone do usuário
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');

  return `${ano}-${mes}-${dia}T${hora}:${minuto}`;
}

/**
 * Formata data para exibição no calendário com indicador de timezone
 * 
 * @param dataGMT3 Data em GMT-3 vinda do banco
 * @returns String formatada ex: "20/05/2026 15:00 (GMT-3)" ou "(seu horário local)"
 */
export function formatarParaCalendario(dataGMT3: string | Date): string {
  let data: Date;
  
  if (typeof dataGMT3 === 'string') {
    if (!dataGMT3.includes('Z') && !dataGMT3.includes('+') && !dataGMT3.includes('-', 10)) {
      data = new Date(dataGMT3 + '-03:00');
    } else {
      data = new Date(dataGMT3);
    }
  } else {
    data = dataGMT3;
  }

  const usuarioTimezone = getUsuarioTimezone();
  const brasilTimezone = BRASIL_TIMEZONE;

  // Formatar data
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const dataFormatada = formatter.format(data);
  
  // Adicionar indicador de timezone se usuário não estiver em GMT-3
  if (usuarioTimezone !== brasilTimezone) {
    const offsetUsuario = -data.getTimezoneOffset() / 60;
    const sinalOffset = offsetUsuario >= 0 ? '+' : '';
    return `${dataFormatada} (GMT${sinalOffset}${offsetUsuario})`;
  }

  return dataFormatada;
}

/**
 * Verifica se usuário está em timezone diferente do Brasil
 */
export function usuarioForaDoBrasil(): boolean {
  return getUsuarioTimezone() !== BRASIL_TIMEZONE;
}
