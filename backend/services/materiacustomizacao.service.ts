import { v4 as uuidv4 } from "uuid";
import ErrorResponse from "../utils/ErrorResponse";
import MateriaCustomizacao from "../entities/materiacustomizacao.model";
import { MateriaCustomizacaoDAO } from "../repositories/materiacustomizacao.repository";
import { MateriaDAO } from "../repositories/materia.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { MaterialProfessorTurmaDAO } from "../repositories/materiaxprofessorxturma.repository";
import R2StorageService from "./r2storage.service";
import { extrairCorDominante } from "../utils/helpers/cor-imagem.helper";
import { getAuditoriaService } from "./auditoria.service";

export interface MateriaCustomizacaoDTO {
  MateriaGUID: string;
  UsuarioCPF: string;
  ImagemUrl: string | null;
  CorFundo: string;
  MensagemBoasVindas: string | null;
}

export default class MateriaCustomizacaoService {
  #customizacaoDAO: MateriaCustomizacaoDAO;
  #materiaDAO: MateriaDAO;
  #escolaDAO: EscolaDAO;
  #alocacaoDAO: MaterialProfessorTurmaDAO;

  constructor(
    customizacaoDAO: MateriaCustomizacaoDAO,
    materiaDAO: MateriaDAO,
    escolaDAO: EscolaDAO,
    alocacaoDAO: MaterialProfessorTurmaDAO
  ) {
    console.log("⬆️  MateriaCustomizacaoService.constructor()");
    this.#customizacaoDAO = customizacaoDAO;
    this.#materiaDAO = materiaDAO;
    this.#escolaDAO = escolaDAO;
    this.#alocacaoDAO = alocacaoDAO;
  }

  salvarCustomizacao = async (
    materiaGUID: string,
    usuarioCPF: string,
    dados: { imagem?: { buffer: Buffer; mimetype: string }; cor?: string; mensagem?: string | null }
  ): Promise<MateriaCustomizacaoDTO> => {
    console.log("🟣 MateriaCustomizacaoService.salvarCustomizacao()");

    const materia = await this.#materiaDAO.findById(materiaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${materiaGUID}`,
      });
    }

    const alocacoes = await this.#alocacaoDAO.findAll({
      MateriaGUID: materiaGUID,
      UsuarioCPF: usuarioCPF,
      AlocacaoStatus: "Ativa",
    });
    if (alocacoes.length === 0) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Você só pode customizar matérias em que está alocado como professor.",
      });
    }

    const existente = await this.#customizacaoDAO.findByMateriaEProfessor(materiaGUID, usuarioCPF);

    const customizacao = new MateriaCustomizacao();
    customizacao.MateriaCustomizacaoGUID = existente?.MateriaCustomizacaoGUID ?? uuidv4();
    customizacao.MateriaGUID = materiaGUID;
    customizacao.UsuarioCPF = usuarioCPF;
    customizacao.MensagemBoasVindas =
      dados.mensagem !== undefined ? dados.mensagem : existente?.MensagemBoasVindas ?? null;

    if (dados.imagem) {
      const extensao = dados.imagem.mimetype.split("/")[1] || "jpg";
      const chave = `materias/${materiaGUID}/${usuarioCPF}/capa-${Date.now()}.${extensao}`;
      const novaUrl = await R2StorageService.upload(chave, dados.imagem.buffer, dados.imagem.mimetype);

      if (existente?.ImagemUrl) {
        R2StorageService.removeByUrl(existente.ImagemUrl).catch((erro) =>
          console.error("Erro ao remover capa antiga da matéria:", erro)
        );
      }

      customizacao.ImagemUrl = novaUrl;
      customizacao.CorFundo = dados.cor || (await extrairCorDominante(dados.imagem.buffer));
    } else {
      customizacao.ImagemUrl = existente?.ImagemUrl ?? null;
      customizacao.CorFundo = dados.cor || existente?.CorFundo || null;
    }

    await this.#customizacaoDAO.upsert(customizacao);

    void getAuditoriaService().registrar({
      EscolaGUID: materia.EscolaGUID,
      UsuarioCPFAtor: usuarioCPF,
      AcaoTipo: existente ? "Update" : "Create",
      EntidadeTipo: "materiacustomizacao",
      EntidadeGUID: customizacao.MateriaCustomizacaoGUID,
      EntidadeDescricao: `Customização de ${materia.MateriaNome} por ${usuarioCPF}`,
      CategoriaAuditoriaId: 2,
    });

    return this.toDTO(customizacao, materia.EscolaGUID);
  };

  buscarCustomizacao = async (materiaGUID: string, usuarioCPF: string): Promise<MateriaCustomizacaoDTO> => {
    console.log("🟣 MateriaCustomizacaoService.buscarCustomizacao()");

    const materia = await this.#materiaDAO.findById(materiaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${materiaGUID}`,
      });
    }

    const customizacao = await this.#customizacaoDAO.findByMateriaEProfessor(materiaGUID, usuarioCPF);
    if (!customizacao) {
      return this.dtoPadrao(materiaGUID, usuarioCPF, materia.EscolaGUID);
    }

    return this.toDTO(customizacao, materia.EscolaGUID);
  };

  listarCustomizacoes = async (materiaGUID: string): Promise<MateriaCustomizacaoDTO[]> => {
    console.log("🟣 MateriaCustomizacaoService.listarCustomizacoes()");

    const materia = await this.#materiaDAO.findById(materiaGUID);
    if (!materia) {
      throw new ErrorResponse(404, "Matéria não encontrada", {
        message: `Não existe matéria com id ${materiaGUID}`,
      });
    }

    const customizacoes = await this.#customizacaoDAO.findAllByMateria(materiaGUID);
    return customizacoes.map((c) => this.toDTO(c, materia.EscolaGUID));
  };

  private toDTO = (customizacao: MateriaCustomizacao, escolaGUID: string): MateriaCustomizacaoDTO => {
    return {
      MateriaGUID: customizacao.MateriaGUID,
      UsuarioCPF: customizacao.UsuarioCPF,
      ImagemUrl: customizacao.ImagemUrl,
      CorFundo: customizacao.CorFundo || "#17C077",
      MensagemBoasVindas: customizacao.MensagemBoasVindas,
    };
  };

  private dtoPadrao = async (materiaGUID: string, usuarioCPF: string, escolaGUID: string): Promise<MateriaCustomizacaoDTO> => {
    const escola = await this.#escolaDAO.findById(escolaGUID);
    return {
      MateriaGUID: materiaGUID,
      UsuarioCPF: usuarioCPF,
      ImagemUrl: null,
      CorFundo: escola?.EscolaCorPriEs ? `#${escola.EscolaCorPriEs.replace(/^#/, "")}` : "#17C077",
      MensagemBoasVindas: null,
    };
  };
}
