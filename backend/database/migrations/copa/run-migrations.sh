#!/bin/bash

# Script para executar as migrations da Copa do Mundo
# Execute este script após configurar as credenciais do MySQL

echo "🏆 Executando migrations do Sistema de Álbum da Copa 2026..."
echo ""

# Verificar se as variáveis de ambiente estão definidas
if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
  echo "❌ Erro: Variáveis de ambiente do banco de dados não encontradas!"
  echo ""
  echo "Configure as seguintes variáveis:"
  echo "  - DB_HOST"
  echo "  - DB_USER"
  echo "  - DB_PASSWORD"
  echo "  - DB_NAME"
  echo ""
  exit 1
fi

echo "✅ Conectando ao banco: $DB_NAME em $DB_HOST"
echo ""

# Executar migrations
echo "1️⃣ Criando tabelas..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backend/database/migrations/copa/001_create_copa_tables.sql

if [ $? -ne 0 ]; then
  echo "❌ Erro ao criar tabelas!"
  exit 1
fi
echo "✅ Tabelas criadas com sucesso!"
echo ""

echo "2️⃣ Inserindo 994 figurinhas..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backend/database/migrations/copa/002_seed_figurinhas.sql

if [ $? -ne 0 ]; then
  echo "❌ Erro ao inserir figurinhas!"
  exit 1
fi
echo "✅ Figurinhas inseridas com sucesso!"
echo ""

echo "3️⃣ Criando índices e views..."
mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < backend/database/migrations/copa/003_create_indexes.sql

if [ $? -ne 0 ]; then
  echo "❌ Erro ao criar índices!"
  exit 1
fi
echo "✅ Índices criados com sucesso!"
echo ""

echo "🎉 Migrations executadas com sucesso!"
echo ""
echo "Verificação:"
echo "  - Figurinhas: $(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sse "SELECT COUNT(*) FROM copa_figurinhas")"
echo "  - Álbuns: $(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sse "SELECT COUNT(*) FROM copa_albuns")"
echo "  - Status: $(mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -sse "SELECT COUNT(*) FROM copa_status")"
echo ""
echo "🏆 Sistema da Copa pronto para uso em /album"
