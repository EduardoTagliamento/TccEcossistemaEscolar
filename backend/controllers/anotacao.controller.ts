import { Request, Response, NextFunction } from 'express';
import { AnotacaoService } from '../services/anotacao.service';
import { AnotacaoCreateDTO, AnotacaoUpdateDTO } from '../entities/anotacao.model';

export class AnotacaoController {
  constructor(private anotacaoService: AnotacaoService) {}

  // POST /api/anotacao - Criar nova anotação
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { EscolaGUID, AnotacaoData, AnotacaoTitulo, AnotacaoDescricao } = req.body;

      const createDTO: AnotacaoCreateDTO = {
        UsuarioCPF: usuarioCPF,
        EscolaGUID,
        AnotacaoData,
        AnotacaoTitulo,
        AnotacaoDescricao
      };

      const anotacao = await this.anotacaoService.criarAnotacao(createDTO);

      res.status(201).json({
        success: true,
        message: 'Anotação criada com sucesso',
        data: anotacao
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/anotacao - Listar anotações (com filtros)
  index = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { EscolaGUID, DataInicio, DataFim, AnotacaoIsFeito } = req.query;

      let anotacoes;

      // Se forneceu range de datas, usar query específica
      if (DataInicio && DataFim) {
        anotacoes = await this.anotacaoService.listarAnotacoesPorPeriodo(
          usuarioCPF,
          EscolaGUID as string,
          DataInicio as string,
          DataFim as string
        );
      } else {
        // Caso contrário, usar filtros gerais
        const filters: any = {
          UsuarioCPF: usuarioCPF,
          EscolaGUID: EscolaGUID as string
        };

        if (AnotacaoIsFeito !== undefined) {
          filters.AnotacaoIsFeito = AnotacaoIsFeito === 'true' || AnotacaoIsFeito === '1';
        }

        anotacoes = await this.anotacaoService.listarAnotacoes(filters);
      }

      res.json({
        success: true,
        data: anotacoes,
        total: anotacoes.length
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/anotacao/:guid - Buscar anotação específica
  show = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { guid } = req.params;

      const anotacao = await this.anotacaoService.buscarAnotacao(guid, usuarioCPF);

      res.json({
        success: true,
        data: anotacao
      });
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/anotacao/:guid - Atualizar anotação
  update = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { guid } = req.params;
      const { AnotacaoData, AnotacaoTitulo, AnotacaoDescricao, AnotacaoIsFeito } = req.body;

      const updateDTO: AnotacaoUpdateDTO = {
        AnotacaoData,
        AnotacaoTitulo,
        AnotacaoDescricao,
        AnotacaoIsFeito
      };

      const anotacao = await this.anotacaoService.atualizarAnotacao(guid, usuarioCPF, updateDTO);

      res.json({
        success: true,
        message: 'Anotação atualizada com sucesso',
        data: anotacao
      });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/anotacao/:guid/toggle - Marcar/desmarcar como feito
  toggleFeito = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { guid } = req.params;

      const anotacao = await this.anotacaoService.marcarComoFeito(guid, usuarioCPF);

      res.json({
        success: true,
        message: `Anotação marcada como ${anotacao.AnotacaoIsFeito ? 'feita' : 'pendente'}`,
        data: anotacao
      });
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/anotacao/:guid - Excluir anotação
  destroy = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { guid } = req.params;

      await this.anotacaoService.excluirAnotacao(guid, usuarioCPF);

      res.json({
        success: true,
        message: 'Anotação excluída com sucesso'
      });
    } catch (error) {
      next(error);
    }
  };

  // GET /api/anotacao/estatisticas - Estatísticas do usuário
  stats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const usuarioCPF = (req as any).usuario.cpf;
      const { EscolaGUID } = req.query;

      if (!EscolaGUID) {
        res.status(400).json({
          success: false,
          message: 'EscolaGUID é obrigatório'
        });
        return;
      }

      const stats = await this.anotacaoService.obterEstatisticas(
        usuarioCPF,
        EscolaGUID as string
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  };
}
