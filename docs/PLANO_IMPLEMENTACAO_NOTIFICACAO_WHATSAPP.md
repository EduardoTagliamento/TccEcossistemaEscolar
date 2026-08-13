# Plano de Implementação — Canal WhatsApp de Notificações

**Status:** ✅ Código implementado (2026-08-12) — falta só o setup manual de infra (seção 2.1: subir a instância no Railway e parear o número via QR code). Sem isso, `EvolutionApiService` lança erro de configuração ausente ao ser instanciado (fail-fast, mesmo padrão do `ResendEmailService`), e todo envio de WhatsApp cai em `Falhou` em `notificacaoenvio` até a infra existir. Pré-requisito de leitura: `docs/PLANO_IMPLEMENTACAO_NOTIFICACOES.md` (sistema de notificações já implementado; este documento cobre só a ativação do canal WhatsApp).

**O que foi implementado (arquivos reais, todos batendo com a spec abaixo sem desvio):**
- `backend/external/EvolutionApiService.ts` (novo) — singleton, valida env no construtor, `sendText(numero, texto)`.
- `backend/services/notificacaocanal/notificacaoWhatsapp.channel.ts` — saiu do stub: formata telefone (`(XX) XXXXX-XXXX` → DDI+dígitos), monta texto plano (`*negrito*` + link), aplica o intercept de `TEST_WHATSAPP_TO` (fase piloto da seção 9), chama `EvolutionApiService`.
- `backend/services/notificacao.service.ts` — `#despacharWhatsapp()`/`#despacharWhatsappSerializado()` gravando em `notificacaoenvio` (Pendente/Enviado/Falhou) igual ao e-mail, MAIS a camada anti-ban da seção 7: fila serializada por instância (`#whatsappFila`, nunca 2 envios em paralelo), delay de 1.8s entre envios, circuit breaker após 5 falhas seguidas (loga erro + marca `Falhou` sem tentar de novo, não derruba a fila pras próximas notificações).
- `.env.example` — `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME`, `WHATSAPP_NUMBER`, `TEST_WHATSAPP_TO`.
- `npx tsc --noEmit -p .` (backend e frontend): 0 erros.

**Não feito nesta rodada (fora do escopo de código, é infra/produto):** provisionar o serviço Evolution API no Railway + parear o número (seção 2.1 — passo manual, precisa acontecer antes de qualquer teste real); mudar os defaults do catálogo (`NotificacaoTipoWhatsappPadrao`) pra `false` pra fase 2 do rollout (seção 9) — ainda estão como ficaram quando o canal era stub, decisão de quando fazer essa mudança fica com você.

**Gatilho:** conseguimos um número real para o projeto — **+55 12 99694-5757** — que passa a ser o número WhatsApp do Ecossistema Escolar (Bauá).

---

## 1. Onde estamos hoje

`backend/services/notificacaocanal/notificacaoWhatsapp.channel.ts` é um stub: só loga e retorna, sem tentar enviar nada e **sem gravar linha em `notificacaoenvio`** (decisão registrada em `PLANO_IMPLEMENTACAO_NOTIFICACOES.md` seção 4.2/10.5, pra evitar um registro "Pendente" eterno enquanto não havia provedor).

`NotificacaoService.#despacharCanais()` (`backend/services/notificacao.service.ts:132`) já resolve a preferência do usuário e, se `PreferenciaWhatsappAtivo`, chama o stub passando `usuario.UsuarioTelefone`. Ou seja: **o hook de disparo já está pronto** — falta só o canal fazer o envio de verdade. É a mesma relação que o canal de e-mail tem com `ResendEmailService`.

`usuario.UsuarioTelefone` (`backend/entities/usuario.model.ts:202`) já existe, é opcional (`string | null`), e quando preenchido é validado no formato `(XX) XXXXX-XXXX` (15 caracteres, com DDD).

O provedor já estava decidido no plano original: **Evolution API** (gateway self-hosted open-source sobre o protocolo do WhatsApp Web/Baileys). Este documento detalha como plugar isso de verdade.

---

## 2. Evolution API — o que é e o que muda de infraestrutura

Evolution API não é um serviço gerenciado tipo Resend — é um **servidor que você mesmo hospeda** (Docker), que abre uma sessão WhatsApp Web por trás e expõe uma REST API sobre ela. Isso tem duas implicações que o e-mail (Resend, SaaS puro) não tinha:

1. **Precisa de um serviço rodando 24/7 além do backend Node** — não é só uma API key num `.env`. Proposta: um serviço Docker separado (Railway, mesmo provedor já usado pro MySQL do projeto — ver `docs/RAILWAY_MYSQL_CONNECTION.md` — ou uma VPS pequena). Fora do escopo deste documento decidir o host exato; só fica registrado que **existe um novo componente de infra**, não é só código.
2. **O número precisa ser pareado uma vez, manualmente**, escaneando um QR code com o WhatsApp instalado no celular físico do +55 12 99694-5757 — exatamente como conectar o WhatsApp Web. Isso é um passo humano de setup, não algo que o backend do Ecossistema Escolar faz sozinho. Depois de pareado, a sessão fica ativa no servidor da Evolution API (persistida) e o backend só chama a REST API normalmente.

### 2.1 Fluxo de pareamento (feito uma vez, por um humano)

```
POST /instance/create   { "instanceName": "baua-producao", "integration": "WHATSAPP-BAILEYS", "qrcode": true }
  → header: apikey: <EVOLUTION_GLOBAL_APIKEY>
  ← devolve o instance token (campo "hash") — vira EVOLUTION_API_KEY do backend

GET /instance/connect/baua-producao
  → header: apikey: <token da instância>
  ← devolve um PNG base64 do QR code

[humano escaneia o QR com o celular do +55 12 99694-5757]

GET /instance/connectionState/baua-producao   → confirma "open" (conectado)
```

Isso deve virar um **script/checklist manual de setup**, não uma rota do produto — não faz sentido expor "reconectar WhatsApp" na UI do Ecossistema Escolar nesta fase.

---

## 3. Cliente novo: `backend/external/EvolutionApiService.ts`

Espelha o padrão de `backend/external/ResendEmailService.ts` (singleton, `getInstance()`, valida env obrigatória no construtor, lança erro claro se faltar configuração):

```ts
export class EvolutionApiService {
  private static instance: EvolutionApiService;
  readonly #baseUrl: string;
  readonly #instanceName: string;
  readonly #apiKey: string;

  private constructor() {
    this.#baseUrl = process.env.EVOLUTION_API_URL || "";
    this.#instanceName = process.env.EVOLUTION_INSTANCE_NAME || "";
    this.#apiKey = process.env.EVOLUTION_API_KEY || "";

    if (!this.#baseUrl || !this.#instanceName || !this.#apiKey) {
      throw new Error(
        "EVOLUTION_API_URL, EVOLUTION_INSTANCE_NAME e EVOLUTION_API_KEY são obrigatórios. " +
        "Ver docs/PLANO_IMPLEMENTACAO_NOTIFICACAO_WHATSAPP.md."
      );
    }
  }

  public static getInstance(): EvolutionApiService { /* ... */ }

  public async sendText(numero: string, texto: string): Promise<{ id: string }> {
    const response = await fetch(`${this.#baseUrl}/message/sendText/${this.#instanceName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: this.#apiKey },
      body: JSON.stringify({ number: numero, text: texto }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Falha ao enviar WhatsApp via Evolution API: ${data?.message ?? response.statusText}`);
    }
    return { id: data.key?.id ?? "" };
  }
}
```

`POST /message/sendText/{instanceName}` com body `{ number, text }` e header `apikey` é o formato confirmado da API v2. `number` precisa estar em DDI+DDD+número sem símbolos (ex.: `5512996945757`), não no formato `(XX) XXXXX-XXXX` que o banco guarda — precisa de uma função de conversão (seção 4).

---

## 4. Formatação do número

`usuario.UsuarioTelefone` é guardado como `(XX) XXXXX-XXXX`. A Evolution API espera dígitos puros com DDI (`55` + DDD + número, sem `+`, sem parênteses, sem traço):

```ts
function paraFormatoEvolutionApi(telefoneFormatado: string): string {
  const digitos = telefoneFormatado.replace(/\D/g, ""); // "11987654321"
  return `55${digitos}`;
}
```

Ponto de atenção conhecido do WhatsApp/Baileys: alguns DDDs antigos ainda têm número de 8 dígitos sem o "9" inicial do celular, e a Evolution API/WhatsApp às vezes exige testar as duas variantes (com e sem o 9º dígito) pra formatar corretamente. Como `UsuarioTelefone` já é validado como 11 dígitos (DDD + 9 dígitos) no cadastro (`usuario.model.ts`), isso deve ser raro na prática — mas vale logar o número (mascarado) em caso de erro de envio pra diagnosticar se aparecer.

---

## 5. `NotificacaoWhatsappChannel` deixa de ser stub

```ts
export default class NotificacaoWhatsappChannel {
  async enviar(destinatarioTelefone: string | null, notificacao: Notificacao): Promise<{ id: string }> {
    if (!destinatarioTelefone) {
      throw new Error("Usuário sem telefone cadastrado");
    }
    const numero = paraFormatoEvolutionApi(destinatarioTelefone);
    const texto = montarTexto(notificacao); // título + conteúdo + link, texto puro (WhatsApp não tem HTML)
    return EvolutionApiService.getInstance().sendText(numero, texto);
  }
}
```

Mesma assinatura de retorno que `NotificacaoEmailChannel.enviar()` (`{ id }`), pra manter os dois canais simétricos em `NotificacaoService`.

### 5.1 Texto da mensagem

WhatsApp não renderiza HTML — precisa de um texto plano curto, algo como:

```
*{NotificacaoTitulo}*
{NotificacaoConteudo}

Ver no Ecossistema Escolar: {FRONTEND_URL}{NotificacaoLink}
```

(`*texto*` é negrito no formato do WhatsApp). Reaproveitar o mesmo `escaparHtml`-equivalente não é necessário aqui pois não há injeção de markup possível em texto plano — mas convém truncar `NotificacaoConteudo` a um tamanho razoável (WhatsApp aceita mensagens longas, mas notificação deveria ser curta por natureza; o campo já é `VARCHAR(500)` no banco).

---

## 6. `NotificacaoService` — WhatsApp passa a ser auditado como o e-mail

Hoje só existe `#despacharEmail()` gravando em `notificacaoenvio`; o branch de WhatsApp em `#despacharCanais()` chama o stub direto, sem `criarPendente`/`marcarEnviado`/`marcarFalhou`. Isso muda — precisa de um `#despacharWhatsapp()` espelhando `#despacharEmail()` linha a linha:

```ts
async #despacharWhatsapp(notificacao: Notificacao): Promise<void> {
  const envioId = await this.#envioDAO.criarPendente(notificacao.NotificacaoGUID, "Whatsapp");
  if (envioId === null) return; // idempotência

  try {
    const usuario = await this.#usuarioDAO.findByGUID(notificacao.UsuarioGUID);
    if (!usuario?.UsuarioTelefone) {
      await this.#envioDAO.marcarFalhou(envioId, "Usuário sem telefone cadastrado");
      return;
    }
    const resultado = await this.#whatsappChannel.enviar(usuario.UsuarioTelefone, notificacao);
    await this.#envioDAO.marcarEnviado(envioId, resultado.id);
  } catch (error: any) {
    await this.#envioDAO.marcarFalhou(envioId, error?.message ?? String(error));
  }
}
```

A tabela `notificacaoenvio` já tem `ENUM('Email','Whatsapp')` desde a migration original — **não precisa de migration nova** pra isso, só do código.

---

## 7. Anti-ban / throttling — o risco novo que o e-mail não tinha

Resend é um provedor de e-mail transacional com infraestrutura de entrega própria; disparar 30 e-mails de uma vez (uma turma inteira recebendo `tarefa_postada`) não tem risco de bloqueio. **Um número de WhatsApp comum conectado via Baileys tem**: enviar muitas mensagens em rajada pro mesmo tipo de conteúdo pra dezenas de destinatários em segundos é um padrão que a Meta associa a spam/automação e pode banir o número.

`NotificacaoService.disparar()` hoje itera destinatários com `await` sequencial (`for` simples, não `Promise.all`), o que já ajuda, mas ainda dispara sem pausa entre eles. Proposta pra esta fase (sem trazer fila/Redis, que seria overkill pro volume atual do projeto):

- Um delay fixo (ex. 1.5–2s) especificamente entre envios de WhatsApp — não precisa atrasar o e-mail nem o INSERT/tempo-real, só o `#despacharWhatsapp()`.
- Circuit breaker simples: se `EvolutionApiService.sendText()` falhar N vezes seguidas (ex. 5), parar de tentar os próximos destinatários dessa leva e logar um alerta claro — sinal de que a sessão caiu (precisa reparear) ou o número está sob restrição, não adianta insistir e piorar.

Isso é suficiente pro volume esperado (turmas de dezenas de alunos, não milhares). Se o projeto crescer a ponto de disparos de centenas/milhares de notificações simultâneas, a solução correta vira uma fila de verdade (BullMQ) — fora de escopo aqui, só registrado como próximo degrau se o volume justificar.

---

## 8. Variáveis de ambiente novas (`.env.example`)

```bash
# WhatsApp (Evolution API - self-hosted, ver docs/PLANO_IMPLEMENTACAO_NOTIFICACAO_WHATSAPP.md)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVOLUTION_INSTANCE_NAME=baua-producao
# Número pareado à instância (informativo — o pareamento em si é feito via QR code, não por env var)
WHATSAPP_NUMBER=+5512996945757
# Se setado, TODO envio de WhatsApp em ambiente não-produção vai pra esse número em vez do
# destinatário real (mesmo padrão de TEST_EMAIL_TO) — evita mandar mensagem de teste pra usuário real.
TEST_WHATSAPP_TO=
```

---

## 9. Rollout — não ligar pra todo mundo de uma vez

O catálogo de tipos (`PLANO_IMPLEMENTACAO_NOTIFICACOES.md` seção 2.6) já tem `NotificacaoTipoWhatsappPadrao=true` pra vários tipos (`materia_postada`, `prova_postada`, `tarefa_postada`, `pendencia_criada`, etc.) — esses defaults foram definidos **quando o canal era um stub inerte**, sem custo real de estar "ligado". Agora que mensagens de verdade vão sair, ligar tudo de uma vez pra toda a base de usuários no primeiro deploy é arriscado (custo de erro alto: número novo, sem histórico, mandando rajada de mensagens pra gente que nunca recebeu nada da Bauá por WhatsApp).

Sugestão de faseamento (fica como recomendação, não decisão fechada — vale confirmar com você antes de implementar):

1. **Fase piloto:** `TEST_WHATSAPP_TO` setado com um número de teste (seu, ou de alguém do time), todo envio real intercepta pro número de teste independente do destinatário calculado. Validar formatação, entrega, texto da mensagem.
2. **Fase preferência explícita:** mudar os defaults do catálogo (`NotificacaoTipoWhatsappPadrao`) pra `false` temporariamente — usuário precisa entrar em Configurações e ativar WhatsApp manualmente pra cada tipo (a tela de preferências já existe, `frontend/.../notificacoes/configuracoes`). Isso naturalmente limita o volume aos usuários que realmente querem.
3. **Fase geral:** depois de validar entrega/custo/reação dos usuários por um tempo, decidir se volta os defaults pra `true` como estava planejado originalmente.

---

## 10. Decisões confirmadas / perguntas em aberto

- **Hospedagem: Railway** (confirmado) — novo serviço Docker no mesmo projeto Railway que já hospeda o MySQL de produção (`docs/RAILWAY_MYSQL_CONNECTION.md`). Evolution API publica uma imagem Docker oficial (`evoapicloud/evolution-api` / `atendai/evolution-api`, conferir a tag atual antes de subir), então é um "Deploy from Docker Image" padrão do Railway — sem Dockerfile próprio necessário. Precisa de volume persistente pra sessão do Baileys sobreviver a redeploys (senão perde o pareamento e precisa escanear o QR code de novo a cada deploy).
- **Número: WhatsApp Business** (confirmado) — +55 12 99694-5757. Não muda a integração tecnicamente (Baileys pareia os dois tipos igual), mas dá nome/foto de perfil verificado, o que passa mais confiança pro destinatário e habilita metadados de catálogo/perfil comercial se o projeto quiser usar depois.
- **Faseamento da seção 9: aprovado** (teste → opt-in explícito → geral) — nenhuma pergunta em aberto restante. Spec pronta pra virar código.

---

## 11. Arquivos a criar/alterar (implementação, após validação desta spec)

**Novos:**
- `backend/external/EvolutionApiService.ts`

**Alterados:**
- `backend/services/notificacaocanal/notificacaoWhatsapp.channel.ts` — sai do stub, chama `EvolutionApiService`
- `backend/services/notificacao.service.ts` — novo método `#despacharWhatsapp()` espelhando `#despacharEmail()`, chamado em `#despacharCanais()`
- `.env.example` — variáveis da seção 8

**Sem mudança de schema** — `notificacaoenvio.NotificacaoEnvioCanal` já suporta `'Whatsapp'`.

**Setup manual (fora do código):** provisionar o serviço Evolution API e parear o número via QR code (seção 2.1) — pré-requisito pra qualquer teste, precisa acontecer antes ou em paralelo à implementação.

---

## Fontes consultadas (documentação pública da Evolution API)

- [Instance Connect — Evolution API Docs](https://doc.evolution-api.com/v1/api-reference/instance-controller/instance-connect)
- [Manual de Integração Evolution API V2 (gist)](https://gist.github.com/dantetesta/b8b7e7e2d6196beae968c8b0a61afb7a)
- [Webhooks — Evolution API](https://evolutionapi-evolution-api-90.mintlify.app/concepts/webhooks)
