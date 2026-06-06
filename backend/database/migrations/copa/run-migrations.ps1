# Executar Migrations da Copa do Mundo 2026
# Execute este script no PowerShell após configurar as variáveis de ambiente

Write-Host "🏆 Executando migrations do Sistema de Álbum da Copa 2026..." -ForegroundColor Green
Write-Host ""

# Verificar variáveis de ambiente
if (-not $env:DB_HOST -or -not $env:DB_USER -or -not $env:DB_PASSWORD -or -not $env:DB_NAME) {
  Write-Host "❌ Erro: Variáveis de ambiente do banco de dados não encontradas!" -ForegroundColor Red
  Write-Host ""
  Write-Host "Configure as seguintes variáveis no arquivo .env:" -ForegroundColor Yellow
  Write-Host "  - DB_HOST"
  Write-Host "  - DB_USER"
  Write-Host "  - DB_PASSWORD"
  Write-Host "  - DB_NAME"
  Write-Host ""
  exit 1
}

Write-Host "✅ Conectando ao banco: $env:DB_NAME em $env:DB_HOST" -ForegroundColor Green
Write-Host ""

# Carregar .env
if (Test-Path .env) {
  Get-Content .env | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.+?)\s*$') {
      [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
    }
  }
}

$mysqlCmd = "mysql"
$mysqlArgs = @(
  "-h", $env:DB_HOST,
  "-u", $env:DB_USER,
  "-p$env:DB_PASSWORD",
  $env:DB_NAME
)

# 1. Criar tabelas
Write-Host "1️⃣ Criando tabelas..." -ForegroundColor Cyan
$result = Get-Content "backend\database\migrations\copa\001_create_copa_tables.sql" | & $mysqlCmd $mysqlArgs

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Erro ao criar tabelas!" -ForegroundColor Red
  exit 1
}
Write-Host "✅ Tabelas criadas com sucesso!" -ForegroundColor Green
Write-Host ""

# 2. Inserir figurinhas
Write-Host "2️⃣ Inserindo 994 figurinhas..." -ForegroundColor Cyan
$result = Get-Content "backend\database\migrations\copa\002_seed_figurinhas.sql" | & $mysqlCmd $mysqlArgs

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Erro ao inserir figurinhas!" -ForegroundColor Red
  exit 1
}
Write-Host "✅ Figurinhas inseridas com sucesso!" -ForegroundColor Green
Write-Host ""

# 3. Criar índices
Write-Host "3️⃣ Criando índices e views..." -ForegroundColor Cyan
$result = Get-Content "backend\database\migrations\copa\003_create_indexes.sql" | & $mysqlCmd $mysqlArgs

if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Erro ao criar índices!" -ForegroundColor Red
  exit 1
}
Write-Host "✅ Índices criados com sucesso!" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Migrations executadas com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "🏆 Sistema da Copa pronto para uso em /album" -ForegroundColor Yellow
