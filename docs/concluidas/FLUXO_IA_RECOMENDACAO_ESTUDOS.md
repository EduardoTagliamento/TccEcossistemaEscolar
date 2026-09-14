# 🧠 Como a IA de Recomendação de Estudos funciona (explicação intuitiva)

**Escopo deste documento:** só o fluxo da IA — o que acontece, passo a passo, entre "professor cria a prova" e "aluno vê as recomendações". Não cobre modelo de dados, código ou decisões de arquitetura (isso está em `SPEC_RECOMENDACAO_ESTUDOS_IA.md` e `PLANO_IMPLEMENTACAO_RECOMENDACAO_ESTUDOS_IA.md`).

---

## A ideia em uma frase

Quando o professor agenda uma prova, o sistema tenta montar, sozinho, um "kit de estudos" pra ela — vídeo, resumo, página de livro e exercícios — mas só mostra o que encontrar de verdade. Nada é inventado.

---

## Exemplo pra seguir o raciocínio

A professora Ana agenda uma prova de Matemática sobre **Trigonometria**, pra semana que vem. É isso que acontece por trás:

## Passo 1 — Descobrir o assunto

Antes de qualquer coisa, o sistema precisa saber *sobre o quê* é a prova.

- **Se a Ana escolheu "Trigonometria" numa listinha** na hora de criar a prova → pronto, já sabe. A IA nem entra em ação nessa etapa.
- **Se a Ana não escolheu nada** → a IA olha pra lista de assuntos que já existem cadastrados pra Matemática naquela escola e tenta adivinhar qual bate com o que ela escreveu na descrição da prova (ou com o conteúdo que ela postou perto da data). Mas ela só pode **escolher um da lista** — nunca inventa um assunto novo do nada. Se não achar nenhum que faça sentido, simplesmente deixa em branco.

> 💡 Por quê isso importa: se a IA pudesse "criar" assuntos livremente, ia gerar bagunça (um dia "Trigonometria", outro "Trig.", outro "Triângulos") e nada seria reaproveitável depois.

## Passo 2 — Juntar material de apoio de verdade

Agora o sistema vai atrás do que a Ana **já ensinou** sobre isso — nunca do que a IA "sabe" de trigonometria em geral.

- Ele procura os conteúdos (textos, materiais) que a Ana postou na mesma categoria da prova, ou, se ela não usa categoria, os mais próximos da data da prova.
- Se a Ana tiver referenciado um capítulo de algum livro didático cadastrado na escola, esse capítulo também entra — mas só as páginas que **já foram revisadas por um humano** (ver Passo 4).

Se não achar nada, sem problema — os próximos passos simplesmente têm menos munição, e algumas peças do kit final podem não aparecer.

## Passo 3 — Duas buscas em paralelo

Com o assunto e o material em mãos, o sistema dispara duas tarefas ao mesmo tempo (uma não espera a outra):

### 🎥 Achar vídeos
1. A IA pensa em 2-3 termos de busca bons pra "Trigonometria" (tipo um aluno digitaria no YouTube).
2. Essas buscas são feitas **de verdade** na API do YouTube.
3. A IA só reordena os resultados reais por relevância — ela nunca inventa um vídeo que não existe.

### 📝 Escrever um resumo
- A IA lê **só** o material que a Ana postou (Passo 2) e escreve um resumo em cima disso.
- Ela é instruída a nunca completar com conhecimento próprio — se o material não for suficiente pra um resumo útil, ela desiste e nenhum resumo aparece (em vez de inventar um resumo genérico de trigonometria).

## Passo 4 — Verificar se tem exercícios disponíveis

Separado disso (e sem envolver IA nenhuma aqui — é só uma busca no banco), o sistema confere: existe algum exercício de vestibular cadastrado pra "Trigonometria"? Se sim, o botão "Praticar" vai aparecer pro aluno depois. Se não, o botão simplesmente não aparece.

## Passo 5 — Referência de página de livro (quando existe)

Se a Ana referenciou um capítulo de livro, o sistema aponta exatamente a faixa de página daquele capítulo — sem gerar texto novo, é só uma consulta direta no que já foi revisado. Nunca a IA "adivinha" o que tem numa página de livro que ela nunca viu — isso é considerado um risco alto demais de invenção, então esse caminho está bloqueado por design.

## Passo 6 — Guardar tudo e mostrar pro aluno

Tudo isso (vídeos, resumo, referência de página, se tem exercícios ou não) é salvo de uma vez só, associado à prova. Quando qualquer aluno daquela turma abrir a prova, ele já vê o resultado pronto — ninguém espera a IA rodar na hora.

O aluno vê até **4 cartões**, mas só os que existirem de verdade:

| Cartão | Aparece quando... |
|---|---|
| 🎥 Vídeo | A busca no YouTube achou algo relevante |
| 📝 Resumo | Havia material de aula suficiente pra resumir |
| 📖 Página de livro | A Ana referenciou um capítulo com página já revisada |
| ✏️ Praticar | Existem exercícios de vestibular cadastrados pra esse assunto |

Se nenhum dos quatro existir, a tela simplesmente não mostra nada de IA — sem gerar um card genérico só pra preencher espaço.

---

## Quando a prova muda

Se a Ana editar a descrição da prova, trocar o assunto travado ou trocar o capítulo de livro referenciado, o sistema **refaz tudo automaticamente** (passos 1 a 6 de novo). Se ela só mudar a data ou o status, nada é refeito — não faz sentido gastar tempo/custo de IA por algo que não muda o conteúdo.

Importante: mesmo que a prova valha pra várias turmas ao mesmo tempo, esse processo roda **uma única vez por prova** — todas as turmas veem o mesmo resultado.

---

## As três regras de ouro por trás de tudo isso

1. **A IA nunca inventa o que não pode verificar.** Vídeo vem de busca real, exercício vem de banco curado por humano, página de livro vem de texto já revisado. A IA só ajuda a *encontrar* e *organizar* — nunca *cria do zero* essas três coisas.
2. **Faltou uma peça? Ela some, e só ela.** Nunca um substituto genérico no lugar do que não foi encontrado.
3. **Se a IA falhar (fora do ar, erro, etc.), a prova continua funcionando normalmente.** Essa recomendação é um "bônus" por cima da prova — nunca uma dependência que pode travar o que já funcionava.
