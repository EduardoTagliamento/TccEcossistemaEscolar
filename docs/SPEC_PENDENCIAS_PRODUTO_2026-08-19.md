# Spec — pendências de produto restantes (2026-08-19)

Contexto: pedido do usuário foi "resolver tudo" das pendências reais em `docs/RELATORIO_BAUA_CODIGO_2.md`, exceto três itens explicitamente excluídos (nota de prova, promoção de admin de plataforma, canal WhatsApp — os dois últimos por dúvida se já não estavam feitos). Dos itens restantes, quatro eram bugs/gaps concretos e já foram implementados nesta sessão (ver nota no topo do relatório). Os que sobraram — este documento — não são bugs de código, são decisões que precisam de contexto/produto antes de qualquer implementação, por isso viram spec em vez de uma linha de checklist.

---

## 1. Provisionamento de banco do zero (schema + seed) — achado maior que o pedido original

### O que foi pedido vs. o que existe de verdade

O item original no relatório era "falta um script de seed/dados de demonstração". Investigando pra implementar isso, o problema é mais fundo: **não existe nenhuma forma de levar um banco MySQL vazio a um estado funcional**, com ou sem dados de demonstração.

- `backend/database/migrations/` tem ~50 arquivos (`.sql` e `.ts` misturados) acumulados desde julho/2026, sem numeração sequencial nem um índice de ordem de execução.
- Não existe `schema.sql` consolidado.
- Não existe comando `npm run migrate` ou equivalente — os `.ts` de migration são scripts standalone (`npx tsx backend/database/migrations/<arquivo>.ts`), pensados pra rodar **um de cada vez, manualmente, contra o banco de produção já existente** (ver padrão em `2026-08-10-usuario-guid-pk.ts`, que tem `--check`/`--apply --confirm-production`).
- `QUICKSTART.md`/`EXECUTAR.md` instruem só `CREATE DATABASE` + `npm run dev` — isso sobe o servidor contra um banco sem nenhuma tabela.
- **Confirmado nesta sessão**: o projeto não tem banco de dev/staging — `.env` aponta direto pro MySQL de produção no Railway. Ou seja, hoje o único banco que "funciona" é literalmente a produção, moldada por meses de migrations manuais aplicadas uma a uma, nunca reproduzida do zero.

### Por que isso importa

- Uma banca avaliando o TCC localmente (ou qualquer clone novo do repositório) não consegue rodar o projeto — trava no primeiro `SELECT` contra uma tabela inexistente.
- Não ter um banco reproduzível também é a causa raiz indireta do incidente documentado em `docs/PROGRESSO_MIGRACAO_USUARIO_GUID.md` (schema de produção sem GUID por 14h): sem um banco de teste separado, toda migration de schema é testada pela primeira vez em produção.

### Por que não implementei isso agora

Construir esse script às cegas — sem um MySQL vazio pra validar contra — é arriscado: ficaria "parecendo pronto" sem nenhuma garantia de que a ordem das ~50 migrations realmente reconstrói o schema atual de produção. Dado que não há ambiente de dev, a única forma responsável de validar é o usuário (ou eu, com a ferramenta certa) subir um MySQL local/descartável primeiro.

### Plano recomendado (nesta ordem)

1. **Consolidar o schema atual num único arquivo**, gerado a partir do banco de produção real (fonte da verdade), não reconstruído lendo as migrations uma a uma:
   ```
   mysqldump --no-data --routines --triggers -u <user> -p tccecossistemaescolar > backend/database/schema.sql
   ```
   Isso captura o estado real, incluindo qualquer ajuste manual que tenha sido feito direto no banco ao longo do tempo (existem vários, documentados em `docs/PROGRESSO_MIGRACAO_USUARIO_GUID.md`).
2. **Testar esse `schema.sql` contra um MySQL vazio** (Docker é o caminho mais rápido: `docker run --name mysql-dev -e MYSQL_ROOT_PASSWORD=dev -p 3306:3306 -d mysql:8`) — só considerar o schema "canônico" depois que `npm run dev` sobe limpo contra ele e as rotas básicas (login, criar escola) respondem.
3. **Documentar esse fluxo** em `EXECUTAR.md`/`QUICKSTART.md`, substituindo o "CREATE DATABASE + npm run dev" que hoje não funciona.
4. **Só depois** escrever o script de seed (dados de demonstração), como um script TypeScript que usa a camada de `services` (não INSERT cru) pra garantir que os dados respeitam toda validação de negócio — mesmo padrão dos scripts em `backend/database/migrations/*.ts`. Escopo sugerido pro seed: 1 escola, 2-3 turmas, 1 Direção, 2-3 professores com alocação em matérias, ~15 alunos matriculados, 1-2 tarefas e 1 conteúdo de exemplo por matéria. Cobrir chat/avisos/pendências/projetos fica pra uma segunda leva se fizer falta.
5. Adicionar `npm run seed` ao `package.json` chamando esse script.

**Decisão que só o usuário pode tomar**: vale a pena esse investimento pro TCC, ou o objetivo é só ter *algo* rápido pra demonstrar na banca (nesse caso, um dump manual de dados de teste já cadastrados via UI, exportado uma vez, resolve mais rápido que construir schema+seed do zero)?

---

## 2. Testes automatizados

Zero testes no projeto inteiro — `package.json` raiz declara `"test": "echo \"Error: no test specified\" && exit 1"`, frontend sem setup nenhum.

Não implementei nada aqui porque não é um bug a corrigir, é escopo a decidir: escrever a primeira leva de testes é uma escolha de *onde começar* (unit nos services mais críticos? integração nas rotas de auth/matrícula? algo de frontend com Testing Library?) e *quanto* cobrir antes da entrega do TCC — decisão de tempo/prioridade do usuário, não algo que dá pra "só fazer" sem direção.

**Pergunta pro usuário**: isso entra no escopo de entrega do TCC? Se sim, qual camada prioriza primeiro (backend crítico — auth/matrícula/migração — vs. um smoke test de frontend)?

---

## 3. Copy/persuasão da landing page

`frontend/app/page.tsx`/`page.module.css` já foram migrados pra usar as CSS Variables do tema (rework de cores, sessão de 2026-07-17) — o que falta é conteúdo: os post-its originais do board Bauá perguntavam "isso já transmite confiança?", "falta algum argumento de persuasão?", "tem alguma dúvida frequente que falta responder?".

Não implementei porque é uma decisão de copywriting/marketing, não de código — preciso saber o que a escola/usuário quer comunicar (diferenciais, prova social, FAQ real) antes de escrever qualquer texto novo.

**Pergunta pro usuário**: tem algum argumento de venda específico (parceria, resultado de piloto, depoimento) que devia entrar na landing? Ou é pra eu sugerir uma copy genérica de "sistema de gestão escolar" mesmo?

---

## 4. Itens excluídos deste pedido (esclarecidos, não implementados)

- **Nota de prova (`prova_nota`)** — confirmado como fora de escopo, não mexido.
- **Promoção de admin de plataforma** — ver seção "Segurança/Infra" do `RELATORIO_BAUA_CODIGO_2.md`: **não** é a mesma coisa que virar Direção de uma escola (isso já é automático ao criar escola, sempre foi). `UsuarioIsPlataformaAdmin` é um flag global sem nenhuma tela/rota de auto-promoção — continua exigindo `UPDATE` manual no banco. Deixei como está porque não é uma falha (zero caminho de escalação via API), só depende de decisão se vale a pena construir um fluxo de setup para isso.
- **Canal WhatsApp** — já estava 100% implementado (`backend/services/notificacaocanal/notificacaoWhatsapp.channel.ts`, via Evolution API, com fila de reenvio e circuit-breaker de falhas consecutivas) antes desta sessão. O item no relatório antigo estava desatualizado, não o código — removido da lista de pendências.
