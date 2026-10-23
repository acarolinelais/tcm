# 002. Multi-tenancy e autenticação: Spec

- **Status:** Aprovada
- **Data:** 2026-10-22

## Problema
Hoje qualquer um acessa a API sem se identificar, não existe isolamento entre unidades organizacionais
diferentes, e não há como organizar pessoas em setores e times dentro de uma unidade. Sem isso, nenhuma
regra de permissão (quem vê, cria ou altera o quê) pode existir.

## Objetivo
Ao final, o sistema exige login, cada pessoa só enxerga e administra dados da própria Unidade, e existe
uma estrutura de Setor → Time → Membros dentro de cada Unidade, com um papel controlando o que cada
pessoa pode fazer sobre essa estrutura.

## Histórias de usuário
- Como **pessoa cadastrada**, quero fazer login com e-mail e senha, para acessar o sistema de forma
  identificada.
- Como **administradora da minha unidade**, quero criar setores e times, para organizar minha
  organização no sistema.
- Como **gerente**, quero criar times nos setores onde atuo e adicionar ou remover pessoas dos times que
  lidero, para montar minhas equipes.
- Como **gerente responsável por um time**, quero marcar um membro como KP desse time, para que ele
  também possa ajudar a gerenciar esse time específico.

## Regras de negócio
- RN-01: Toda pessoa autenticada pertence a exatamente uma Unidade.
- RN-02: Um Setor pertence a uma Unidade; um Time pertence a um Setor; um vínculo de membro pertence a
  um Time.
- RN-03: Uma pessoa é gerente de um time quando listada como responsável por ele; pode ser responsável
  por mais de um time.
- RN-04: Uma pessoa é KP de um time quando seu vínculo com aquele time específico tiver esse papel; o
  poder de KP vale só nesse time, mesmo que a pessoa seja membro comum em outro.
- RN-05: Quem administra a unidade pode fazer tudo que um gerente faz em qualquer time da unidade
  (adicionar e remover membros, marcar alguém como KP), além de criar setores e times — não fica restrita
  aos times que ela mesma criou. Não enxerga nem administra outra unidade.
- RN-06: Login exige e-mail e senha cadastrados; a senha nunca é armazenada nem exposta em texto puro.
- RN-07: A primeira Unidade e sua primeira administradora existem desde a inicialização do sistema, sem
  precisar de um fluxo de cadastro aberto.

## Critérios de aceite
> Use o formato Dado / Quando / Então. Inclua cenários de **falha**.

- **CA-01:** Dado e-mail e senha corretos de uma pessoa cadastrada, quando ela faz login, então recebe
  um token de acesso válido.
- **CA-02 (falha):** Dado e-mail ou senha incorretos, quando a pessoa tenta fazer login, então o sistema
  recusa sem dizer qual dos dois estava errado.
- **CA-03 (falha):** Dado nenhum token, ou um token inválido ou expirado, quando a pessoa tenta acessar
  um recurso protegido, então o sistema recusa o acesso.
- **CA-04:** Dado quem administra a unidade autenticado, quando cria um setor na própria unidade, então
  o setor passa a existir e aparece na listagem de setores dessa unidade.
- **CA-05 (falha):** Dado uma pessoa autenticada que não administra a unidade, quando tenta criar um
  setor, então o sistema recusa.
- **CA-06:** Dado quem administra a unidade autenticado, quando cria um time num setor da própria
  unidade e define um responsável, então o time passa a existir com esse responsável.
- **CA-07:** Dado um gerente responsável por um time, **ou** quem administra a unidade desse time, quando
  adiciona uma pessoa da mesma unidade como membro (dev comum) desse time, então essa pessoa passa a
  aparecer na lista de membros do time.
- **CA-08 (falha):** Dado um gerente, quando tenta adicionar ou remover um membro de um time que não
  lidera, então o sistema recusa — exceto se essa pessoa também administra a unidade.
- **CA-09:** Dado um gerente responsável por um time, **ou** quem administra a unidade desse time, quando
  marca um membro desse time como KP, então esse membro passa a ter o papel de KP só naquele time.
- **CA-10 (falha):** Dado quem administra uma unidade, quando tenta listar ou alterar setores ou times
  de outra unidade, então o sistema recusa o acesso.
- **CA-11:** Dado o sistema inicializado pela primeira vez, quando ele sobe, então já existe uma Unidade
  com uma pessoa administradora válida para login.

## Fora de escopo
- Qualquer entidade de Task/Caso de Teste e as regras de posse ou transferência sobre ela — depende de
  uma entidade que ainda não existe nesta spec; fica para uma spec futura.
- Refresh token, recuperação de senha, convite por e-mail, troca de senha.
- Integração com a futura API corporativa de autenticação — o ADR já prevê a troca, mas não é este v1.
- Um papel acima de Unidade (cross-tenant) — decidido que não existe por ora.
- Telas de login e de gestão de setor/time no frontend — esta spec cobre só o backend; o frontend entra
  numa spec seguinte, depois que a API existir.

## Dúvidas em aberto
- Nenhuma crítica no momento; detalhes de formato de senha/token ficam para o `plan.md`.
