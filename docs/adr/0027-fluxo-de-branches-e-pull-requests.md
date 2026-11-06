# 0027. Fluxo de branches (`main` + `dev`) e convenção de commits

- **Status:** Aceito; proibição de commit direto na `dev` substituída por [0035](0035-commits-diretos-na-dev.md)
- **Data:** 2026-10-23

## Contexto
Até a spec 008 todo commit foi direto para a `main`. Com mais de uma pessoa contribuindo, isso mistura
trabalho em andamento com código estável, não liga mudanças às specs e não dá um ponto onde a
verificação automática possa barrar uma quebra. O ADR 0011 deixou o CI pendente "para quando o fluxo
de branches for definido".

## Decisão
**Branches de longa duração**
- `main`: código estável. Só recebe PR vindo da `dev` ou de uma `hotfix/*`.
- `dev`: integração (o papel da `develop` do GitFlow). Recebe PR de branches de trabalho e o PR de
  sincronização `main → dev`.
- Nenhuma das duas aceita commit ou push direto.

**Hotfix**: correção urgente que não pode esperar a próxima promoção da `dev`.
1. `hotfix/<descricao>` sai da `main` e volta para a `main` por PR. Os commits usam o tipo `fix`.
2. Logo depois do merge, um PR `main → dev` leva a correção para a `dev`. Sem isso, a correção se
   perderia de vista na `dev` e poderia gerar conflitos na próxima promoção.

**Branches de trabalho** saem da `dev` e voltam para a `dev` por PR:
```
<tipo>/<descricao-em-kebab-case>

feat/009-fluxo-branches-ci   # implementação de spec: feat/ exige o número NNN da spec
fix/login-sem-idioma
docs/adr-0027
refactor/repositorio-base
chore/atualiza-deps
```
Tipos aceitos (os mesmos dos commits): `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`,
`perf`, `ci` e `build`. A descrição usa só `a-z`, `0-9`, `.` e `-`. O prefixo `hotfix/` é exclusivo das
branches de hotfix (acima) e não é tipo de commit.

**Commits e títulos de PR** seguem Conventional Commits:
```
<tipo>(<escopo opcional>)!?: <descrição>

feat(usuarios): filtra por perfil
fix: corrige idioma no login
refactor(api)!: renomeia rota de times
```
Mensagens geradas pelo git (`Merge ...` e `Revert ...`) são aceitas.

**Pull requests**
- Uma spec corresponde a uma branch `feat/NNN-...` e a um PR para a `dev`. Cada bloco do `tasks.md` é um
  ou mais commits nessa branch. A descrição do PR cita a pasta da spec (`docs/specs/NNN-nome`).
- PR `dev → main` promove o que está estável, por exemplo ao concluir uma spec.
- Um PR só pode ser integrado com as verificações obrigatórias verdes (ADR 0028). Aprovação humana é opcional.
- A integração é por **merge commit** (squash e rebase desabilitados). As branches de trabalho são
  apagadas depois do merge. A `dev` nunca é apagada.
- A branch padrão do repositório no GitHub passa a ser a `dev`, para que um PR novo aponte para ela.

## Alternativas consideradas
- **Só `main` com branches de trabalho (GitHub flow):** mais simples, mas não separa o que foi integrado
  do que foi promovido como estável.
- **GitFlow completo (`release/*` e tags):** sem deploy nem versões, essas branches seriam só cerimônia.
  Do GitFlow ficam a `dev` e as `hotfix/*`.
- **Hotfix passando pela `dev`:** mais simples, mas obriga a promover tudo o que está na `dev` só para
  entregar uma correção urgente.
- **Hotfix com dois PRs da mesma branch (para `main` e para `dev`):** a branch é apagada depois do
  primeiro merge, e o PR `main → dev` sincroniza também qualquer outra diferença.
- **Squash merge:** histórico linear, mas apaga os commits por bloco, que são material de estudo.
- **Aprovação humana obrigatória:** trava quem trabalha sozinho. O objetivo é manter `dev` e `main` verdes.

## Consequências
- ✅ A `main` só recebe código que já passou pela `dev` com o CI verde.
- ✅ Cada PR de feature aponta para a spec que explica o porquê, e o histórico preserva os commits por bloco.
- ⚠️ Toda mudança precisa de dois PRs para chegar à `main` (trabalho → `dev` → `main`, ou
  hotfix → `main` → `dev`).
- ⚠️ Esquecer o PR `main → dev` depois de um hotfix deixa a `dev` sem a correção. O script de convenção
  não consegue impedir isso. Fica no passo a passo do README.
- ⚠️ Mudanças triviais também precisam de branch e PR.
- ⚠️ Os commits anteriores a este ADR não seguem todos a convenção. A regra vale só para commits novos.
