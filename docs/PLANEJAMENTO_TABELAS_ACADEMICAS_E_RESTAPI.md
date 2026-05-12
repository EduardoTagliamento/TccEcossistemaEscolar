# Planejamento de Expansao Academica: SQL + REST API

Data: 12/05/2026  
Status: Planejamento funcional para implementacao

## Objetivo
Este documento define:
1. Mudancas no schema SQL para suportar materias, cursos, turmas, matriculas e alocacao docente.
2. Validacoes por campo.
3. Contrato da REST API CRUD para materias, turmas, cursos, professores e alunos.
4. Regras de negocio importantes, incluindo mudanca de turma de aluno.

## Decisoes de modelagem
1. `TurmaAno` foi removido conforme solicitado. O campo correto sera `TurmaSerie`.
2. `escola` recebera `EscolaIsTecnica` para habilitar/desabilitar CRUD de cursos e selecao de curso na turma.
3. A matricula sera historica por registro. PK recomendada: `MatriculaGUID`.
4. `MatriculaGUID` aceitara RA quando informado pela escola. Se nao vier RA no create, o sistema gera UUID automaticamente.
5. Professores e alunos continuam na tabela `usuario`; as APIs de professores/alunos serao filtros de vinculo + matricula/alocacao.

## SQL de migracao proposto

## 1) Alteracao da tabela escola
```sql
ALTER TABLE `tccecossistemaescolar`.`escola`
ADD COLUMN `EscolaIsTecnica` BOOLEAN NOT NULL DEFAULT FALSE AFTER `EscolaStatus`,
ADD INDEX `idx_escola_is_tecnica` (`EscolaIsTecnica`);
```

Validacao do campo:
1. `EscolaIsTecnica`: booleano obrigatorio.
2. `FALSE`: escola regular.
3. `TRUE`: habilita CRUD de cursos e uso opcional de `CursoGUID` na turma.

## 2) Tabela materia
```sql
CREATE TABLE `tccecossistemaescolar`.`materia` (
  `MateriaGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `MateriaNome` VARCHAR(100) NOT NULL,
  `MateriaIsTecnico` BOOLEAN NOT NULL DEFAULT FALSE,
  `MateriaStatus` ENUM('Ativa', 'Inativa') NOT NULL DEFAULT 'Ativa',
  `MateriaCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `MateriaUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MateriaGUID`),
  UNIQUE KEY `UQ_Materia_Escola_Nome` (`EscolaGUID`, `MateriaNome`),
  INDEX `idx_materia_escola` (`EscolaGUID`),
  INDEX `idx_materia_tecnica` (`MateriaIsTecnico`),
  INDEX `idx_materia_status` (`MateriaStatus`),
  CONSTRAINT `FK_Materia_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `tccecossistemaescolar`.`escola` (`EscolaGUID`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);
```

Validacao dos campos:
1. `MateriaGUID`: UUID v4 valido.
2. `EscolaGUID`: deve existir em `escola`.
3. `MateriaNome`: obrigatorio, trim, 3 a 100 chars.
4. `MateriaIsTecnico`: booleano.
5. `MateriaStatus`: `Ativa` ou `Inativa`.

## 3) Tabela curso
```sql
CREATE TABLE `tccecossistemaescolar`.`curso` (
  `CursoGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `CursoNome` VARCHAR(256) NOT NULL,
  `CursoStatus` ENUM('Ativo', 'Inativo') NOT NULL DEFAULT 'Ativo',
  `CursoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `CursoUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`CursoGUID`),
  UNIQUE KEY `UQ_Curso_Escola_Nome` (`EscolaGUID`, `CursoNome`),
  INDEX `idx_curso_escola` (`EscolaGUID`),
  INDEX `idx_curso_status` (`CursoStatus`),
  CONSTRAINT `FK_Curso_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `tccecossistemaescolar`.`escola` (`EscolaGUID`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);
```

Validacao dos campos:
1. `CursoGUID`: UUID v4 valido.
2. `EscolaGUID`: deve existir em `escola`.
3. `CursoNome`: obrigatorio, trim, 3 a 256 chars.
4. `CursoStatus`: `Ativo` ou `Inativo`.

Regra de negocio:
1. So permitir criar curso se `EscolaIsTecnica = TRUE`.

## 4) Tabela turma
```sql
CREATE TABLE `tccecossistemaescolar`.`turma` (
  `TurmaGUID` CHAR(36) NOT NULL,
  `EscolaGUID` CHAR(36) NOT NULL,
  `TurmaSerie` VARCHAR(12) NOT NULL,
  `TurmaNome` VARCHAR(256) NOT NULL,
  `TurmaIsTecnico` BOOLEAN NOT NULL DEFAULT FALSE,
  `CursoGUID` CHAR(36) NULL,
  `TurmaStatus` ENUM('Ativa', 'Inativa', 'Encerrada') NOT NULL DEFAULT 'Ativa',
  `TurmaCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `TurmaUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`TurmaGUID`),
  UNIQUE KEY `UQ_Turma_Escola_Serie_Nome` (`EscolaGUID`, `TurmaSerie`, `TurmaNome`),
  INDEX `idx_turma_escola` (`EscolaGUID`),
  INDEX `idx_turma_serie` (`TurmaSerie`),
  INDEX `idx_turma_tecnica` (`TurmaIsTecnico`),
  INDEX `idx_turma_curso` (`CursoGUID`),
  INDEX `idx_turma_status` (`TurmaStatus`),
  CONSTRAINT `FK_Turma_Escola` FOREIGN KEY (`EscolaGUID`)
    REFERENCES `tccecossistemaescolar`.`escola` (`EscolaGUID`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `FK_Turma_Curso` FOREIGN KEY (`CursoGUID`)
    REFERENCES `tccecossistemaescolar`.`curso` (`CursoGUID`)
    ON UPDATE CASCADE
    ON DELETE SET NULL
);
```

Validacao dos campos:
1. `TurmaGUID`: UUID v4 valido.
2. `EscolaGUID`: deve existir em `escola`.
3. `TurmaSerie`: obrigatorio, trim, 1 a 12 chars. Ex.: `1EM`, `2EM`, `3MODA`.
4. `TurmaNome`: obrigatorio, trim, 2 a 256 chars.
5. `TurmaIsTecnico`: booleano.
6. `CursoGUID`: totalmente opcional. Se informado, deve pertencer a mesma escola.
7. `TurmaStatus`: `Ativa`, `Inativa` ou `Encerrada`.

Regras de negocio:
1. Se `EscolaIsTecnica = FALSE`, `TurmaIsTecnico` deve ser `FALSE` e `CursoGUID` deve ser `NULL`.
2. Se `EscolaIsTecnica = TRUE` e `TurmaIsTecnico = TRUE`, a turma pode opcionalmente vincular a um curso via `CursoGUID`. Nem toda turma técnica precisa ter curso vinculado.
3. Se `EscolaIsTecnica = TRUE`, pode haver turmas normais (com `TurmaIsTecnico = FALSE`) na mesma escola.

## 5) Tabela matricula
```sql
CREATE TABLE `tccecossistemaescolar`.`matricula` (
  `MatriculaGUID` VARCHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `TurmaGUID` CHAR(36) NOT NULL,
  `MatriculaDataEntrada` DATE NOT NULL DEFAULT (CURRENT_DATE),
  `MatriculaDataSaida` DATE NULL,
  `MatriculaStatus` ENUM('Ativa', 'Transferida', 'Concluida', 'Cancelada') NOT NULL DEFAULT 'Ativa',
  `MatriculaCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `MatriculaUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MatriculaGUID`),
  UNIQUE KEY `UQ_Matricula_Usuario_Turma` (`UsuarioCPF`, `TurmaGUID`),
  INDEX `idx_matricula_usuario` (`UsuarioCPF`),
  INDEX `idx_matricula_turma` (`TurmaGUID`),
  INDEX `idx_matricula_status` (`MatriculaStatus`),
  CONSTRAINT `FK_Matricula_Usuario` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `tccecossistemaescolar`.`usuario` (`UsuarioCPF`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `FK_Matricula_Turma` FOREIGN KEY (`TurmaGUID`)
    REFERENCES `tccecossistemaescolar`.`turma` (`TurmaGUID`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);
```

Validacao dos campos:
1. `MatriculaGUID`: RA em qualquer formato alfanumérico (ex.: `RA123456`, `A001B`, `2026-SALA-A`) OU UUID v4 gerado automaticamente se não informado.
2. `UsuarioCPF`: formato `XXX.XXX.XXX-XX` e usuario existente.
3. `TurmaGUID`: turma existente.
4. `MatriculaDataEntrada`: data valida.
5. `MatriculaDataSaida`: maior ou igual a entrada quando informado.
6. `MatriculaStatus`: `Ativa`, `Transferida`, `Concluida` ou `Cancelada`.

Regra de negocio:
1. Um aluno pode ter varias matriculas historicas em escolas/turmas diferentes.
2. Deve existir no maximo 1 matricula ativa por usuario no mesmo periodo letivo (regra de servico).
3. No create de matricula: se `MatriculaGUID` (RA) for informado, usar o valor informado; se nao for informado, gerar UUID automaticamente.

## 6) Tabela materiaxprofessorxturma
```sql
CREATE TABLE `tccecossistemaescolar`.`materiaxprofessorxturma` (
  `MatProfTurGUID` CHAR(36) NOT NULL,
  `MateriaGUID` CHAR(36) NOT NULL,
  `TurmaGUID` CHAR(36) NOT NULL,
  `UsuarioCPF` VARCHAR(14) NOT NULL,
  `AlocacaoStatus` ENUM('Ativa', 'Inativa') NOT NULL DEFAULT 'Ativa',
  `AlocacaoCreatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `AlocacaoUpdatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MatProfTurGUID`),
  UNIQUE KEY `UQ_Alocacao_Materia_Turma_Professor` (`MateriaGUID`, `TurmaGUID`, `UsuarioCPF`),
  INDEX `idx_alocacao_materia` (`MateriaGUID`),
  INDEX `idx_alocacao_turma` (`TurmaGUID`),
  INDEX `idx_alocacao_professor` (`UsuarioCPF`),
  INDEX `idx_alocacao_status` (`AlocacaoStatus`),
  CONSTRAINT `FK_Alocacao_Materia` FOREIGN KEY (`MateriaGUID`)
    REFERENCES `tccecossistemaescolar`.`materia` (`MateriaGUID`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `FK_Alocacao_Turma` FOREIGN KEY (`TurmaGUID`)
    REFERENCES `tccecossistemaescolar`.`turma` (`TurmaGUID`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,
  CONSTRAINT `FK_Alocacao_Professor` FOREIGN KEY (`UsuarioCPF`)
    REFERENCES `tccecossistemaescolar`.`usuario` (`UsuarioCPF`)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);
```

Validacao dos campos:
1. `MatProfTurGUID`: UUID v4 valido.
2. `MateriaGUID`: materia existente.
3. `TurmaGUID`: turma existente.
4. `UsuarioCPF`: usuario existente com funcao de professor na escola.
5. `AlocacaoStatus`: `Ativa` ou `Inativa`.

Regra de negocio:
1. A materia e a turma devem ser da mesma escola.
2. O professor precisa ter vinculo ativo em `escolaxusuarioxfuncao` com `FuncaoId` de professor.

## Ordem de execucao da migracao
1. `ALTER TABLE escola ADD EscolaIsTecnica`.
2. `CREATE TABLE materia`.
3. `CREATE TABLE curso`.
4. `CREATE TABLE turma`.
5. `CREATE TABLE matricula`.
6. `CREATE TABLE materiaxprofessorxturma`.

## Documentacao da REST API

## Convencoes gerais
1. Base path: `/api`.
2. Autenticacao: JWT no header `Authorization: Bearer {token}`.
3. Todas as rotas exigem usuario autenticado.
4. Rotas de escrita (`POST`, `PUT`, `DELETE`) exigem usuario com funcao `Coordenacao` (1) ou `Direcao` (6) ativa na escola.
5. Demais funcoes podem apenas consultar (`GET`).
6. Padrao de resposta:
```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

## 1) API de Materias
Base path: `/api/materia`

Autenticacao e autorizacao:
- Requer JWT valido.
- GET: todos os usuarios autenticados podem consultar.
- POST, PUT, DELETE: requerem funcao `Coordenacao` (1) ou `Direcao` (6) ativa na escola.

Endpoints:
1. `POST /api/materia` (requer Coordenacao ou Direcao)
2. `GET /api/materia?EscolaGUID=&MateriaStatus=&MateriaIsTecnico=` (todos autenticados)
3. `GET /api/materia/:MateriaGUID` (todos autenticados)
4. `PUT /api/materia/:MateriaGUID` (requer Coordenacao ou Direcao)
5. `DELETE /api/materia/:MateriaGUID` (requer Coordenacao ou Direcao)

Payload create/update:
```json
{
  "materia": {
    "EscolaGUID": "uuid",
    "MateriaNome": "Matematica",
    "MateriaIsTecnico": false,
    "MateriaStatus": "Ativa"
  }
}
```

Validacoes principais:
1. Nome unico por escola.
2. Materia tecnica deve respeitar `EscolaIsTecnica`.

## 2) API de Cursos
Base path: `/api/curso`

Autenticacao e autorizacao:
- Requer JWT valido.
- GET: todos os usuarios autenticados podem consultar.
- POST, PUT, DELETE: requerem funcao `Coordenacao` (1) ou `Direcao` (6) ativa na escola.

Endpoints:
1. `POST /api/curso` (requer Coordenacao ou Direcao)
2. `GET /api/curso?EscolaGUID=&CursoStatus=` (todos autenticados)
3. `GET /api/curso/:CursoGUID` (todos autenticados)
4. `PUT /api/curso/:CursoGUID` (requer Coordenacao ou Direcao)
5. `DELETE /api/curso/:CursoGUID` (requer Coordenacao ou Direcao)

Payload create/update:
```json
{
  "curso": {
    "EscolaGUID": "uuid",
    "CursoNome": "Informatica",
    "CursoStatus": "Ativo"
  }
}
```

Validacoes principais:
1. So permite criar curso quando `EscolaIsTecnica = TRUE`.
2. Nome unico por escola.

## 3) API de Turmas
Base path: `/api/turma`

Autenticacao e autorizacao:
- Requer JWT valido.
- GET: todos os usuarios autenticados podem consultar.
- POST, PUT, DELETE: requerem funcao `Coordenacao` (1) ou `Direcao` (6) ativa na escola.

Endpoints:
1. `POST /api/turma` (requer Coordenacao ou Direcao)
2. `GET /api/turma?EscolaGUID=&TurmaSerie=&TurmaStatus=&TurmaIsTecnico=` (todos autenticados)
3. `GET /api/turma/:TurmaGUID` (todos autenticados)
4. `PUT /api/turma/:TurmaGUID` (requer Coordenacao ou Direcao)
5. `DELETE /api/turma/:TurmaGUID` (requer Coordenacao ou Direcao)

Payload create/update:
```json
{
  "turma": {
    "EscolaGUID": "uuid",
    "TurmaSerie": "2EM",
    "TurmaNome": "Turma B",
    "TurmaIsTecnico": false,
    "CursoGUID": null,
    "TurmaStatus": "Ativa"
  }
}
```

Validacoes principais:
1. `CursoGUID` é totalmente opcional. Se informado, deve pertencer a mesma escola.
2. Se `EscolaIsTecnica = FALSE`, bloquear criacao de turma com `TurmaIsTecnico = TRUE`.
3. Se `EscolaIsTecnica = TRUE`, permite turmas normais (`TurmaIsTecnico = FALSE`) e turmas técnicas (`TurmaIsTecnico = TRUE`) opcionalmente vinculadas a cursos.

## 4) API de Matriculas (alunos)
Base path: `/api/matricula`

Autenticacao e autorizacao:
- Requer JWT valido.
- GET: todos os usuarios autenticados podem consultar.
- POST, PUT, DELETE e transferencia: requerem funcao `Coordenacao` (1) ou `Direcao` (6) ativa na escola.

Endpoints CRUD:
1. `POST /api/matricula` (requer Coordenacao ou Direcao)
2. `GET /api/matricula?UsuarioCPF=&TurmaGUID=&MatriculaStatus=` (todos autenticados)
3. `GET /api/matricula/:MatriculaGUID` (todos autenticados)
4. `PUT /api/matricula/:MatriculaGUID` (requer Coordenacao ou Direcao)
5. `DELETE /api/matricula/:MatriculaGUID` (requer Coordenacao ou Direcao)

Endpoint de transferencia (recomendado):
1. `POST /api/matricula/transferir` (requer Coordenacao ou Direcao)

Payload create:
```json
{
  "matricula": {
    "MatriculaGUID": "2026000123",
    "UsuarioCPF": "123.456.789-09",
    "TurmaGUID": "uuid",
    "MatriculaDataEntrada": "2026-02-10"
  }
}
```

Observacao:
1. `MatriculaGUID` e opcional no create.
2. Se informado, e tratado como RA da escola.
3. Se nao informado, o backend gera UUID automaticamente.

Payload transferir:
```json
{
  "transferencia": {
    "UsuarioCPF": "123.456.789-09",
    "TurmaOrigemGUID": "uuid-antigo",
    "TurmaDestinoGUID": "uuid-novo",
    "DataTransferencia": "2026-06-01"
  }
}
```

Logica de mudanca de turma:
1. Encerrar matricula ativa na turma origem com `MatriculaStatus = Transferida` e `MatriculaDataSaida`.
2. Criar nova matricula na turma destino com `MatriculaStatus = Ativa`.
3. Tudo em transacao unica (BEGIN/COMMIT/ROLLBACK).

## 5) API de Professores
Base path: `/api/professor`

Objetivo:
1. Expor usuarios com perfil professor por escola.
2. Gerenciar alocacao `materiaxprofessorxturma`.

Autenticacao e autorizacao:
- Requer JWT valido.
- GET: todos os usuarios autenticados podem consultar.
- POST, PUT, DELETE: requerem funcao `Coordenacao` (1) ou `Direcao` (6) ativa na escola.

Endpoints:
1. `GET /api/professor?EscolaGUID=` (todos autenticados)
2. `GET /api/professor/:UsuarioCPF/escolas/:EscolaGUID/alocacoes` (todos autenticados)
3. `POST /api/professor/alocacao` (requer Coordenacao ou Direcao)
4. `PUT /api/professor/alocacao/:MatProfTurGUID` (requer Coordenacao ou Direcao)
5. `DELETE /api/professor/alocacao/:MatProfTurGUID` (requer Coordenacao ou Direcao)

Payload de alocacao:
```json
{
  "alocacao": {
    "MateriaGUID": "uuid",
    "TurmaGUID": "uuid",
    "UsuarioCPF": "123.456.789-09",
    "AlocacaoStatus": "Ativa"
  }
}
```

Validacoes principais:
1. Professor deve ter funcao professor ativa na escola.
2. Materia e turma da mesma escola.
3. Evitar duplicidade de alocacao.

## 6) API de Alunos
Base path: `/api/aluno`

Objetivo:
1. Expor usuarios-alunos e sua vida escolar via matriculas.

Autenticacao e autorizacao:
- Requer JWT valido.
- GET: todos os usuarios autenticados podem consultar.
- POST, PUT, DELETE: requerem funcao `Coordenacao` (1) ou `Direcao` (6) ativa na escola.

Endpoints:
1. `GET /api/aluno?EscolaGUID=&TurmaGUID=&MatriculaStatus=` (todos autenticados)
2. `GET /api/aluno/:UsuarioCPF/historico-matriculas` (todos autenticados)
3. `POST /api/aluno/matricula` (requer Coordenacao ou Direcao; delega internamente para API matricula)
4. `POST /api/aluno/transferencia` (requer Coordenacao ou Direcao; delega para transferencia)
5. `POST /api/aluno/rematricula` (requer Coordenacao ou Direcao)

Payload rematricula:
```json
{
  "rematricula": {
    "UsuarioCPF": "123.456.789-09",
    "TurmaGUID": "uuid",
    "MatriculaDataEntrada": "2027-02-01"
  }
}
```

## Regras de autorizacao
1. `Coordenacao` (1) e `Direcao` (6): podem criar, atualizar e excluir registros de materias, cursos, turmas, matriculas, alocacoes de professores e operacoes academicas de alunos.
2. Demais funcoes: possuem apenas acesso de leitura nas rotas `GET`.
3. Professor, Aluno e Responsavel: apenas consulta dos dados permitidos pelo perfil; sem acesso de escrita.

## Regras transversais importantes
1. Todas as operacoes com impacto em historico academico devem ser transacionais.
2. Soft-delete recomendado para entidades academicas de negocio (`MateriaStatus`, `CursoStatus`, `TurmaStatus`).
3. Nunca apagar historico de matricula fisicamente em ambiente produtivo.
4. Garantir auditoria via `CreatedAt` e `UpdatedAt`.

## Backlog tecnico para implementar
1. Criar entities: `materia`, `curso`, `turma`, `matricula`, `materiaxprofessorxturma`.
2. Criar repositories e services com validacoes de escola/funcao.
3. Criar middlewares de validacao de payload e parametros.
4. Criar controllers e routes REST para os 6 modulos.
5. Criar seeds de exemplo para cursos, turmas e materias.
6. Criar testes de integracao para:
   1. Criacao de turma tecnica em escola nao tecnica.
   2. Transferencia de aluno com rollback em erro.
   3. Alocacao docente com validacao de funcao.

## Planejamento MVC + Service das 5 tabelas/modulos principais
Escopo desta etapa:
1. `materia`
2. `curso`
3. `turma`
4. `matricula`
5. `professor` (modulo de alocacao baseado em `materiaxprofessorxturma`)

Objetivo do padrao:
1. Seguir o mesmo desenho usado hoje em `usuario`, `escola` e `escolaxusuarioxfuncao`.
2. Manter `routes` responsavel pela montagem das dependencias.
3. Manter `controller` focado em HTTP.
4. Manter `service` responsavel pelas regras de negocio.
5. Manter `repository` responsavel apenas pelo acesso ao MySQL.
6. Manter `middleware` responsavel por validacao e normalizacao de entrada.

### O que precisa ser feito em cada pasta

#### `backend/entities`
Criar:
1. `materia.model.ts`
2. `curso.model.ts`
3. `turma.model.ts`
4. `matricula.model.ts`
5. `materiaxprofessorxturma.model.ts`

Responsabilidades:
1. Representar a estrutura exata da tabela.
2. Declarar todos os campos persistidos no banco.
3. Manter tipos consistentes com MySQL e com os DTOs de retorno.
4. Nao colocar regra de negocio complexa na entity.

Regras:
1. Campos `CreatedAt` e `UpdatedAt` devem existir nas models.
2. `MatriculaGUID` deve aceitar string livre, sem forcar formato numerico.
3. `CursoGUID` em `turma` deve ser nullable.
4. A model de alocacao de professor deve refletir exatamente a tabela `materiaxprofessorxturma`.

#### `backend/repositories`
Criar:
1. `materia.repository.ts`
2. `curso.repository.ts`
3. `turma.repository.ts`
4. `matricula.repository.ts`
5. `materiaxprofessorxturma.repository.ts`

Responsabilidades:
1. Implementar `create`, `update`, `delete`, `findAll`, `findById` e buscas auxiliares.
2. Executar SQL parametrizado.
3. Mapear rows do banco para entities.
4. Expor consultas auxiliares para validacoes do service.

Consultas auxiliares esperadas:
1. `materia.repository.ts`: busca por `EscolaGUID + MateriaNome`, filtro por status e tecnico.
2. `curso.repository.ts`: busca por `EscolaGUID + CursoNome`, filtro por status.
3. `turma.repository.ts`: busca por `EscolaGUID + TurmaSerie + TurmaNome`, filtro por status e tecnico.
4. `matricula.repository.ts`: busca por `UsuarioCPF`, `TurmaGUID`, `MatriculaStatus`, matricula ativa do aluno e historico.
5. `materiaxprofessorxturma.repository.ts`: busca por `UsuarioCPF`, `TurmaGUID`, `MateriaGUID`, `AlocacaoStatus` e validacao de duplicidade da alocacao.

Regras:
1. Repository nao decide autorizacao.
2. Repository nao monta resposta HTTP.
3. Repository deve retornar `null` ou `false` quando a linha nao existir, deixando o erro final para o service.
4. Para `matricula`, preparar operacoes que possam ser usadas em transacao de transferencia.
5. Para `professor`, preparar consultas para listar alocacoes por escola, por professor e por turma.

#### `backend/services`
Criar:
1. `materia.service.ts`
2. `curso.service.ts`
3. `turma.service.ts`
4. `matricula.service.ts`
5. `professor.service.ts`

Responsabilidades:
1. Validar existencia de escola, curso, turma, usuario e matricula.
2. Aplicar regras de negocio antes de chamar o repository.
3. Converter entity para DTO seguro e consistente.
4. Centralizar erros com `ErrorResponse`.
5. Coordenar fluxos de escrita, especialmente transferencia de matricula.

Regras obrigatorias do service:
1. Validar se o usuario autenticado possui funcao `Coordenacao` (1) ou `Direcao` (6) para `POST`, `PUT` e `DELETE`.
2. Permitir `GET` para usuarios autenticados, respeitando filtros e escopo da escola.
3. `materia`: impedir nome duplicado por escola.
4. `materia`: se `MateriaIsTecnico = true`, validar `EscolaIsTecnica = true`.
5. `curso`: permitir CRUD apenas se `EscolaIsTecnica = true`.
6. `curso`: impedir nome duplicado por escola.
7. `turma`: se escola nao for tecnica, bloquear `TurmaIsTecnico = true`.
8. `turma`: permitir `CursoGUID` nulo mesmo quando `TurmaIsTecnico = true`.
9. `turma`: se `CursoGUID` for informado, validar que pertence a mesma escola.
10. `matricula`: validar existencia do usuario aluno e da turma.
11. `matricula`: impedir mais de uma matricula ativa conflitante conforme regra do periodo letivo.
12. `matricula`: se `MatriculaGUID` nao vier, gerar UUID automaticamente.
13. `matricula`: transferencia deve encerrar a matricula anterior e criar a nova em transacao unica.
14. `professor`: validar que o `UsuarioCPF` informado possui vinculo ativo na escola com funcao de professor.
15. `professor`: validar que materia e turma pertencem a mesma escola.
16. `professor`: impedir duplicidade de alocacao para a combinacao `MateriaGUID + TurmaGUID + UsuarioCPF`.
17. `professor`: listar professores a partir de `usuario` + `escolaxusuarioxfuncao`, e usar `materiaxprofessorxturma` para CRUD de alocacao.

#### `backend/controllers`
Criar:
1. `materia.controller.ts`
2. `curso.controller.ts`
3. `turma.controller.ts`
4. `matricula.controller.ts`
5. `professor.controller.ts`

Responsabilidades:
1. Receber `request`, `response` e `next`.
2. Ler params, query e body normalizados pelo middleware.
3. Chamar o metodo correto do service.
4. Retornar padrao JSON ja usado no projeto.
5. Encaminhar erros com `next(error)`.

Metodos esperados por controller:
1. `store`
2. `index`
3. `show`
4. `update`
5. `destroy`

Metodos adicionais:
1. `matricula.controller.ts`: `transferir`.
2. `professor.controller.ts`: `listarAlocacoesPorProfessor`.

Regras:
1. Controller nao deve validar regra de negocio profunda.
2. Controller nao deve montar SQL.
3. Controller nao deve decidir permissao diretamente; no maximo encaminha o `request.user` para o service.

#### `backend/middlewares`
Criar:
1. `materia.middleware.ts`
2. `curso.middleware.ts`
3. `turma.middleware.ts`
4. `matricula.middleware.ts`
5. `professor.middleware.ts`

Responsabilidades:
1. Validar body de create e update.
2. Validar params (`GUID`, `CPF`, etc.).
3. Validar querystrings de filtro.
4. Normalizar payload para o formato esperado pelo controller/service.

Regras por middleware:
1. `materia.middleware.ts`: validar `MateriaNome`, `EscolaGUID`, `MateriaStatus`, `MateriaIsTecnico`.
2. `curso.middleware.ts`: validar `CursoNome`, `EscolaGUID`, `CursoStatus`.
3. `turma.middleware.ts`: validar `TurmaSerie`, `TurmaNome`, `TurmaIsTecnico`, `CursoGUID`, `TurmaStatus`.
4. `matricula.middleware.ts`: validar `UsuarioCPF`, `TurmaGUID`, `MatriculaGUID`, datas e status.
5. `matricula.middleware.ts`: aceitar `MatriculaGUID` em qualquer formato de string.
6. `professor.middleware.ts`: validar `UsuarioCPF`, `MateriaGUID`, `TurmaGUID` e `AlocacaoStatus`.
7. Todos devem reaproveitar `ErrorResponse` para manter padrao dos erros.

#### `routes`
Criar:
1. `materia.routes.ts`
2. `curso.routes.ts`
3. `turma.routes.ts`
4. `matricula.routes.ts`
5. `professor.routes.ts`

Responsabilidades:
1. Instanciar `MysqlDatabase`, repositories, services, controllers e middlewares.
2. Registrar as rotas no mesmo estilo de `usuario.routes.ts`, `escola.routes.ts` e `escolaxusuarioxfuncao.routes.ts`.
3. Aplicar `AuthMiddleware.authenticate` nas rotas do modulo.
4. Encadear middleware de validacao antes do controller.

Rotas minimas esperadas:
1. `materia`: `POST /`, `GET /`, `GET /:MateriaGUID`, `PUT /:MateriaGUID`, `DELETE /:MateriaGUID`.
2. `curso`: `POST /`, `GET /`, `GET /:CursoGUID`, `PUT /:CursoGUID`, `DELETE /:CursoGUID`.
3. `turma`: `POST /`, `GET /`, `GET /:TurmaGUID`, `PUT /:TurmaGUID`, `DELETE /:TurmaGUID`.
4. `matricula`: `POST /`, `GET /`, `GET /:MatriculaGUID`, `PUT /:MatriculaGUID`, `DELETE /:MatriculaGUID`, `POST /transferir`.
5. `professor`: `GET /?EscolaGUID=`, `GET /:UsuarioCPF/escolas/:EscolaGUID/alocacoes`, `POST /alocacao`, `PUT /alocacao/:MatProfTurGUID`, `DELETE /alocacao/:MatProfTurGUID`.

Regras:
1. Todas as rotas devem exigir autenticacao.
2. O bloqueio por perfil de escrita deve acontecer antes do commit final da operacao, preferencialmente no service.
3. O arquivo de rotas deve continuar sendo o ponto de composicao das dependencias.

#### `app.ts`
Atualizar:
1. Registro dos novos roteadores em `/api/materia`, `/api/curso`, `/api/turma`, `/api/matricula` e `/api/professor`.
2. Ordem de inicializacao coerente com os modulos ja existentes.

#### `docs/routes`
Criar ou atualizar:
1. `materia-api.md`
2. `curso-api.md`
3. `turma-api.md`
4. `matricula-api.md`
5. `professor-api.md`

Responsabilidades:
1. Documentar payloads, filtros, respostas e erros.
2. Documentar quais endpoints aceitam somente leitura e quais exigem escrita.
3. Documentar exemplos com dados reais do dominio.

### Regras transversais que precisam ser aplicadas
1. Manter o padrao de resposta `{ success, message, data }`.
2. Usar `ErrorResponse` para erros de validacao, autorizacao e recurso nao encontrado.
3. Nao expor detalhes de SQL em controller nem em rota.
4. Validacoes simples ficam no middleware; validacoes de negocio e permissao ficam no service.
5. Escrita (`POST`, `PUT`, `DELETE`) somente para `Coordenacao` (1) e `Direcao` (6).
6. Leitura (`GET`) liberada para usuarios autenticados.
7. Toda regra dependente de escola deve validar o relacionamento correto por `EscolaGUID`.
8. Operacoes de matricula que alteram historico devem ser transacionais.
9. Nomes de classes e arquivos devem seguir o padrao ja usado no projeto.
10. DTOs devem omitir campos internos que nao precisam sair para o frontend.
11. O modulo `professor` nao cria um cadastro novo de usuario; ele trabalha com usuarios ja existentes e com vinculo de funcao valido na escola.

## Observacao de compatibilidade
O frontend deve usar `EscolaIsTecnica` para:
1. Exibir/ocultar a tela de CRUD de cursos.
2. Exigir/ocultar o seletor de curso ao criar/editar turma.
3. Exibir filtros tecnicos de materia/turma apenas quando aplicavel.


