/**
 * Migration: Adicionar campo EscolaIsTecnica na tabela escola
 * Data: 12/05/2026
 * Descrição: Adiciona flag booleana para identificar escolas técnicas
 */

import MysqlDatabase from '../MysqlDatabase';

async function runMigration() {
  console.log('🔧 Iniciando migration: add-escola-is-tecnica');
  
  const db = new MysqlDatabase();
  
  try {
    const pool = await db.getPool();
    
    // 1. Verificar se coluna já existe
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'escola' 
        AND COLUMN_NAME = 'EscolaIsTecnica'
    `, [process.env.DB_NAME || 'railway']);
    
    if (Array.isArray(columns) && columns.length > 0) {
      console.log('✅ Coluna EscolaIsTecnica já existe. Migration ignorada.');
      process.exit(0);
    }
    
    // 2. Adicionar coluna
    console.log('📝 Adicionando coluna EscolaIsTecnica...');
    await pool.execute(`
      ALTER TABLE escola 
      ADD COLUMN EscolaIsTecnica BOOLEAN NOT NULL DEFAULT FALSE 
      AFTER EscolaStatus
    `);
    
    console.log('✅ Coluna EscolaIsTecnica adicionada com sucesso');
    
    // 3. Adicionar índice
    console.log('📝 Adicionando índice idx_escola_is_tecnica...');
    await pool.execute(`
      ALTER TABLE escola 
      ADD INDEX idx_escola_is_tecnica (EscolaIsTecnica)
    `);
    
    console.log('✅ Índice idx_escola_is_tecnica adicionado com sucesso');
    
    console.log('🎉 Migration concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    process.exit(1);
  }
}

runMigration();
