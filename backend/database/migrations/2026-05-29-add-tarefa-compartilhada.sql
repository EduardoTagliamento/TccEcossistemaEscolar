-- Migration: Adicionar campos de Tarefa Compartilhada
-- Data: 2026-05-29
-- Descrição: Adiciona suporte para tarefas compartilhadas com grupos de alunos

USE tccecossistemaescolar;

-- Adicionar campos na tabela tarefaacademica
ALTER TABLE `tarefaacademica`
ADD COLUMN `TarefaCompartilhada` BOOLEAN NOT NULL DEFAULT FALSE 
  COMMENT 'Se TRUE, tarefa é feita em grupos',
ADD COLUMN `TarefaMinPessoas` INT NULL 
  COMMENT 'Mínimo de pessoas por grupo (obrigatório se compartilhada)',
ADD COLUMN `TarefaMaxPessoas` INT NULL 
  COMMENT 'Máximo de pessoas por grupo (obrigatório se compartilhada)',
ADD CONSTRAINT `CHK_TarefaMinPessoas` CHECK (`TarefaMinPessoas` >= 1),
ADD CONSTRAINT `CHK_TarefaMaxPessoas` CHECK (`TarefaMaxPessoas` >= `TarefaMinPessoas`),
ADD INDEX `idx_tarefa_compartilhada` (`TarefaCompartilhada`);

-- Verificar resultado
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT, 
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'tccecossistemaescolar'
  AND TABLE_NAME = 'tarefaacademica'
  AND COLUMN_NAME IN ('TarefaCompartilhada', 'TarefaMinPessoas', 'TarefaMaxPessoas');
