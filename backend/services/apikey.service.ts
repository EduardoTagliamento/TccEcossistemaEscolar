/**
 * 🟣 Service - ApiKey
 *
 * Camada de lógica de negócio para emissão/listagem/revogação de chaves de
 * API. A validação da chave em si (usada a cada requisição de um parceiro)
 * fica em `backend/middlewares/apikey.middleware.ts`, não aqui — este
 * service cobre só a gestão feita pela Direção da escola.
 *
 * Ver docs/PLANO_IMPLEMENTACAO_API_KEYS.md.
 */

import crypto from "crypto";
import { gerarGUID } from "../utils/helpers/guid.helper";
import ApiKey, { ApiKeyEscopo, ESCOPOS_APIKEY_VALIDOS } from "../entities/apikey.model";
import { ApiKeyDAO } from "../repositories/apikey.repository";
import { EscolaDAO } from "../repositories/escola.repository";
import { EscolaxUsuarioxFuncaoDAO } from "../repositories/escolaxusuarioxfuncao.repository";
import ErrorResponse from "../utils/ErrorResponse";
import { getAuditoriaService } from "./auditoria.service";

/** FuncaoId 6 = Direção — ver backend/services/evento.service.ts para o mapa completo de papéis. */
const FUNCAO_DIRECAO = 6;

/** Categoria "SegurancaConta" (ver categoriaauditoria) — emissão/revogação de chave é evento de segurança, não operacional. */
const CATEGORIA_AUDITORIA_SEGURANCA = 5;

export interface ApiKeyDTO {
  ApiKeyGUID: string;
  EscolaGUID: string;
  ApiKeyNome: string;
  ApiKeyPrefixo: string;
  ApiKeyEscopos: ApiKeyEscopo[];
  ApiKeyStatus: "Ativa" | "Revogada";
  ApiKeyCriadoPorGUID: string;
  ApiKeyUltimoUsoEm: Date | null;
  ApiKeyCreatedAt: Date;
  ApiKeyUpdatedAt: Date;
}

export interface ApiKeyCreateDTO {
  EscolaGUID: string;
  ApiKeyNome: string;
  ApiKeyEscopos: ApiKeyEscopo[];
}

/** Só retornado UMA vez, na criação — nunca mais reconstruído a partir do banco. */
export interface ApiKeyCreatedDTO {
  apiKey: ApiKeyDTO;
  chave: string;
}

export default class ApiKeyService {
  #apiKeyDAO: ApiKeyDAO;
  #escolaDAO: EscolaDAO;
  #escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO;

  constructor(apiKeyDAO: ApiKeyDAO, escolaDAO: EscolaDAO, escolaxUsuarioxFuncaoDAO: EscolaxUsuarioxFuncaoDAO) {
    console.log("🟣 ApiKeyService.constructor()");
    this.#apiKeyDAO = apiKeyDAO;
    this.#escolaDAO = escolaDAO;
    this.#escolaxUsuarioxFuncaoDAO = escolaxUsuarioxFuncaoDAO;
  }

  /**
   * CREATE - Emitir nova chave de API.
   * Apenas Direção (FuncaoId 6) da escola. O segredo completo (`chave`) só
   * existe nesta resposta — dali em diante só o prefixo fica recuperável.
   */
  async store(data: ApiKeyCreateDTO, usuarioGUID: string): Promise<ApiKeyCreatedDTO> {
    console.log("🟣 ApiKeyService.store()");

    await this.#validarPermissaoDirecao(usuarioGUID, data.EscolaGUID);

    const escola = await this.#escolaDAO.findById(data.EscolaGUID);
    if (!escola) {
      throw new ErrorResponse(404, "Escola não encontrada");
    }

    if (!data.ApiKeyEscopos || data.ApiKeyEscopos.length === 0) {
      throw new ErrorResponse(400, "Selecione ao menos um escopo para a chave");
    }
    for (const escopo of data.ApiKeyEscopos) {
      if (!ESCOPOS_APIKEY_VALIDOS.includes(escopo)) {
        throw new ErrorResponse(400, "Escopo inválido", {
          message: `"${escopo}" não é um escopo reconhecido. Válidos: ${ESCOPOS_APIKEY_VALIDOS.join(", ")}`,
        });
      }
    }

    const { tokenCompleto, prefixoVisivel, hash } = this.#gerarToken();

    const apiKey = ApiKey.fromPlainObject({
      ApiKeyGUID: gerarGUID(),
      EscolaGUID: data.EscolaGUID,
      ApiKeyNome: data.ApiKeyNome.trim(),
      ApiKeyPrefixo: prefixoVisivel,
      ApiKeyHashSecreto: hash,
      ApiKeyEscopos: data.ApiKeyEscopos,
      ApiKeyStatus: "Ativa",
      ApiKeyCriadoPorGUID: usuarioGUID,
      ApiKeyUltimoUsoEm: null,
      ApiKeyCreatedAt: new Date(),
      ApiKeyUpdatedAt: new Date(),
    });

    const created = await this.#apiKeyDAO.create(apiKey);

    void getAuditoriaService().registrar({
      EscolaGUID: created.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUID,
      AcaoTipo: "Create",
      EntidadeTipo: "apikey",
      EntidadeGUID: created.ApiKeyGUID,
      EntidadeDescricao: created.ApiKeyNome,
      CategoriaAuditoriaId: CATEGORIA_AUDITORIA_SEGURANCA,
    });

    return { apiKey: this.#toDTO(created), chave: tokenCompleto };
  }

  /**
   * INDEX - Listar chaves da escola (mascaradas — nunca o segredo/hash).
   * Apenas Direção.
   */
  async index(escolaGUID: string, usuarioGUID: string): Promise<ApiKeyDTO[]> {
    console.log("🟣 ApiKeyService.index()");

    await this.#validarPermissaoDirecao(usuarioGUID, escolaGUID);

    const chaves = await this.#apiKeyDAO.findAllByEscola(escolaGUID);
    return chaves.map((k) => this.#toDTO(k));
  }

  /**
   * DESTROY - Revogar chave (soft delete). Apenas Direção da escola dona da chave.
   */
  async destroy(guid: string, usuarioGUID: string): Promise<void> {
    console.log("🟣 ApiKeyService.destroy()");

    const apiKey = await this.#apiKeyDAO.findById(guid);
    if (!apiKey) {
      throw new ErrorResponse(404, "Chave de API não encontrada");
    }

    await this.#validarPermissaoDirecao(usuarioGUID, apiKey.EscolaGUID);

    if (apiKey.ApiKeyStatus === "Revogada") {
      return; // idempotente — revogar de novo não é erro
    }

    await this.#apiKeyDAO.revoke(guid);

    void getAuditoriaService().registrar({
      EscolaGUID: apiKey.EscolaGUID,
      UsuarioGUIDAtor: usuarioGUID,
      AcaoTipo: "Delete",
      EntidadeTipo: "apikey",
      EntidadeGUID: apiKey.ApiKeyGUID,
      EntidadeDescricao: apiKey.ApiKeyNome,
      CategoriaAuditoriaId: CATEGORIA_AUDITORIA_SEGURANCA,
    });
  }

  // ==================== HELPERS PRIVADOS ====================

  async #validarPermissaoDirecao(usuarioGUID: string, escolaGUID: string): Promise<void> {
    const vinculos = await this.#escolaxUsuarioxFuncaoDAO.findAll({
      EscolaGUID: escolaGUID,
      UsuarioGUID: usuarioGUID,
    });

    if (!vinculos.some((v) => v.Status === "Ativo" && v.FuncaoId === FUNCAO_DIRECAO)) {
      throw new ErrorResponse(403, "Sem permissão", {
        message: "Apenas a Direção da escola pode gerenciar chaves de API.",
      });
    }
  }

  /**
   * Gera o segredo (24 bytes aleatórios, base64url = 32 caracteres),
   * monta o token completo e o prefixo visível, e calcula o hash SHA-256
   * que de fato vai pro banco. SHA-256 (não bcrypt) de propósito: o
   * middleware precisa achar a chave por lookup EXATO indexado a cada
   * requisição de um parceiro — o segredo já tem entropia alta o
   * suficiente (192 bits) pra não precisar do custo computacional do
   * bcrypt, que aqui só atrasaria toda chamada autenticada por chave.
   */
  #gerarToken(): { tokenCompleto: string; prefixoVisivel: string; hash: string } {
    const secretoBruto = crypto.randomBytes(24).toString("base64url");
    const tokenCompleto = `baua_live_${secretoBruto}`;
    const prefixoVisivel = `baua_live_${secretoBruto.slice(0, 8)}`;
    const hash = crypto.createHash("sha256").update(tokenCompleto).digest("hex");

    return { tokenCompleto, prefixoVisivel, hash };
  }

  #toDTO(apiKey: ApiKey): ApiKeyDTO {
    return {
      ApiKeyGUID: apiKey.ApiKeyGUID,
      EscolaGUID: apiKey.EscolaGUID,
      ApiKeyNome: apiKey.ApiKeyNome,
      ApiKeyPrefixo: apiKey.ApiKeyPrefixo,
      ApiKeyEscopos: apiKey.ApiKeyEscopos,
      ApiKeyStatus: apiKey.ApiKeyStatus,
      ApiKeyCriadoPorGUID: apiKey.ApiKeyCriadoPorGUID,
      ApiKeyUltimoUsoEm: apiKey.ApiKeyUltimoUsoEm,
      ApiKeyCreatedAt: apiKey.ApiKeyCreatedAt,
      ApiKeyUpdatedAt: apiKey.ApiKeyUpdatedAt,
    };
  }
}
