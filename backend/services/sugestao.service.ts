import { v4 as uuidv4 } from 'uuid';
import { SugestaoDAO } from '../repositories/sugestao.repository';
import { Sugestao, SugestaoComAutor, SugestaoCreateDTO } from '../entities/sugestao.model';
import ErrorResponse from '../utils/ErrorResponse';

const SUGESTAO_TEXTO_MAX = 2000;

export class SugestaoService {
  constructor(private sugestaoDAO: SugestaoDAO) {}

  async criarSugestao(data: SugestaoCreateDTO): Promise<Sugestao> {
    const texto = data.SugestaoTexto.trim();
    if (!texto) {
      throw new ErrorResponse(400, 'Escreva sua sugestão antes de enviar');
    }
    if (texto.length > SUGESTAO_TEXTO_MAX) {
      throw new ErrorResponse(400, `Sugestão não pode exceder ${SUGESTAO_TEXTO_MAX} caracteres`);
    }

    const sugestao: Sugestao = {
      SugestaoGUID: uuidv4(),
      UsuarioCPF: data.UsuarioCPF,
      EscolaGUID: data.EscolaGUID ?? null,
      SugestaoTexto: texto,
      SugestaoPaginaUrl: data.SugestaoPaginaUrl?.slice(0, 255) ?? null,
      SugestaoCreatedAt: new Date(),
    };

    return this.sugestaoDAO.create(sugestao);
  }

  async listarSugestoes(): Promise<SugestaoComAutor[]> {
    return this.sugestaoDAO.findAllComAutor();
  }

  async excluirSugestao(guid: string): Promise<void> {
    const deleted = await this.sugestaoDAO.delete(guid);
    if (!deleted) {
      throw new ErrorResponse(404, 'Sugestão não encontrada');
    }
  }
}
