/**
 * Migration: Adicionar campo CursoGUID na tabela materia
 * Data: 12/06/2026
 * Descrição: Permite associar matérias a cursos específicos (necessário para escolas técnicas)
 */

import MysqlDatabase from '../MysqlDatabase';

async function runMigration() {
  console.log('🔧 Iniciando migration: add-curso-guid-to-materia');
  
  const db = new MysqlDatabase();
  
  try {
    const pool = await db.getPool();
    
    // 1. Verificar se coluna já existe
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
        AND TABLE_NAME = 'materia' 
        AND COLUMN_NAME = 'CursoGUID'
    `, [process.env.DB_NAME || 'railway']);
    
    if (Array.isArray(columns) && columns.length > 0) {
      console.log('✅ Coluna CursoGUID já existe. Migration ignorada.');
      process.exit(0);
    }
    
    // 2. Adicionar coluna
    console.log('📝 Adicionando coluna CursoGUID...');
    await pool.execute(`
      ALTER TABLE materia 
      ADD COLUMN CursoGUID CHAR(36) NULL 
      AFTER EscolaGUID
    `);
    
    console.log('✅ Coluna CursoGUID adicionada com sucesso');
    
    // 3. Adicionar índice
    console.log('📝 Adicionando índice idx_materia_curso...');
    await pool.execute(`
      ALTER TABLE materia 
      ADD INDEX idx_materia_curso (CursoGUID)
    `);
    
    console.log('✅ Índice idx_materia_curso adicionado com sucesso');
    
    // 4. Adicionar foreign key
    console.log('📝 Adicionando constraint FK_Materia_Curso...');
    await pool.execute(`
      ALTER TABLE materia 
      ADD CONSTRAINT FK_Materia_Curso FOREIGN KEY (CursoGUID)
        REFERENCES curso (CursoGUID)
        ON UPDATE CASCADE
        ON DELETE SET NULL
    `);
    
    console.log('✅ Constraint FK_Materia_Curso adicionada com sucesso');
    
    console.log('🎉 Migration concluída com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error);
    process.exit(1);
  }
}

runMigration();
