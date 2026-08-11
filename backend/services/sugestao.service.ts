import { gerarGUID } from "../utils/helpers/guid.helper";
import { SugestaoDAO } from '../repositories/sugestao.repository';
import { RelacaoAnexosDAO } from '../repositories/relacaoanexos.repository';
import { AnexoDAO } from '../repositories/anexo.repository';
import { Sugestao, SugestaoComAutor, SugestaoCreateDTO } from '../entities/sugestao.model';
import { UsuarioDAO } from '../repositories/usuario.repository';
import ErrorResponse from '../utils/ErrorResponse';

const SUGESTAO_TEXTO_MAX = 2000;

export class SugestaoService {
  constructor(
    private sugestaoDAO: SugestaoDAO,
    private relacaoAnexosDAO: RelacaoAnexosDAO,
    private anexoDAO: AnexoDAO,
    private usuarioDAO: UsuarioDAO
  ) {}

  async criarSugestao(data: SugestaoCreateDTO): Promise<Sugestao> {
    const texto = data.SugestaoTexto.trim();
    if (!texto) {
      throw new ErrorResponse(400, 'Escreva sua sugestão antes de enviar');
    }
    if (texto.length > SUGESTAO_TEXTO_MAX) {
      throw new ErrorResponse(400, `Sugestão não pode exceder ${SUGESTAO_TEXTO_MAX} caracteres`);
    }

    const sugestao: Sugestao = {
      SugestaoGUID: gerarGUID(),
      UsuarioGUID: data.UsuarioGUID,
      EscolaGUID: data.EscolaGUID ?? null,
      SugestaoTexto: texto,
      SugestaoPaginaUrl: data.SugestaoPaginaUrl?.slice(0, 255) ?? null,
      SugestaoCreatedAt: new Date(),
    };

    const created = await this.sugestaoDAO.create(sugestao);

    // Anexo já foi enviado antes via POST /api/anexo (mesmo limite de
    // mimetype/tamanho de qualquer outro anexo do sistema) — aqui só
    // vincula o(s) AnexoGUID(s) já existente(s), mesma regra de posse de
    // TarefaAcademicaService.enviarAnexoEntrega / AvisoService.criarAviso:
    // só dá pra anexar arquivo que você mesmo enviou.
    if (data.AnexoGUIDs && data.AnexoGUIDs.length > 0) {
      // anexo ainda usa CPF (tabela não migrada) — resolver o CPF real do
      // autor da sugestão pra comparar com o dono do anexo.
      const usuario = await this.usuarioDAO.findByGUID(data.UsuarioGUID);
      if (!usuario?.UsuarioCPF) {
        throw new ErrorResponse(403, 'Usuário sem CPF cadastrado');
      }
      const usuarioCPF = usuario.UsuarioCPF;

      for (const anexoGUID of data.AnexoGUIDs) {
        const anexo = await this.anexoDAO.findById(anexoGUID);
        if (!anexo) {
          throw new ErrorResponse(404, `Anexo ${anexoGUID} não encontrado`);
        }
        if (anexo.UsuarioCPF !== usuarioCPF) {
          throw new ErrorResponse(403, 'Você só pode anexar arquivos que você mesmo enviou');
        }
        await this.relacaoAnexosDAO.vincularAnexoSugestao(anexoGUID, created.SugestaoGUID);
      }
    }

    return created;
  }

  async listarSugestoes(): Promise<SugestaoComAutor[]> {
    const sugestoes = await this.sugestaoDAO.findAllComAutor();
    return Promise.all(
      sugestoes.map(async (sugestao) => ({
        ...sugestao,
        Anexos: await this.relacaoAnexosDAO.findAnexosBySugestao(sugestao.SugestaoGUID),
      }))
    );
  }

  async excluirSugestao(guid: string): Promise<void> {
    const deleted = await this.sugestaoDAO.delete(guid);
    if (!deleted) {
      throw new ErrorResponse(404, 'Sugestão não encontrada');
    }
  }
}
