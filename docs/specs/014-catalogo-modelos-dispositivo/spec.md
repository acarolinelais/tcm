# 014. Catálogo de modelos de dispositivo: Spec

- **Status:** Aprovada
- **Data:** 2026-10-25
- **ADRs relacionados:** 0013, 0015, 0018, 0026
- **Evolui:** spec 011 (RN-04, RN-09 e CA-05)

## Problema

O catálogo de modelos de dispositivo criado na spec 011 guarda só o nome e o estado de cada modelo. Ele
fica escondido dentro de Projetos, e qualquer pessoa que gerencia projetos pode alterá-lo, inclusive o
gerente. Quem conhece os aparelhos e mantém o catálogo é o KP, mas ele não tem um lugar próprio para isso
nem como descrever cada modelo. Como qualquer gestor pode mexer, o catálogo também fica sujeito a
alterações de quem não é responsável por ele.

## Objetivo

O catálogo ganha uma entrada própria na navegação, chamada **Device models**, com descrição e datas de
criação e atualização de cada modelo. Só o KP e o administrador da unidade cadastram, editam, ativam e
inativam modelos. As demais pessoas continuam vendo os modelos onde eles aparecem em outros contextos,
como projetos e Form Factor.

## Histórias de usuário

- Como **KP**, quero cadastrar um modelo de dispositivo com nome e descrição para que os projetos dos
  times usem um catálogo correto.
- Como **KP**, quero editar e inativar modelos para manter o catálogo atualizado sem apagar o histórico.
- Como **administrador da unidade**, quero ter o mesmo acesso do KP ao catálogo.
- Como **gerente**, quero continuar escolhendo modelos ativos ao criar um projeto, sem gerenciar o catálogo.
- Como **dev**, quero ver os modelos associados aos projetos e resultados em que trabalho.

## Regras de negócio

- RN-01: Cada modelo de dispositivo tem identificador, nome, descrição, status (`Ativo` ou `Inativo`),
  data de criação e data de atualização.
- RN-02: O nome é obrigatório, tem no máximo 100 caracteres e não pode se repetir dentro da mesma
  unidade. A comparação ignora espaços nas pontas.
- RN-03: A descrição é opcional e tem no máximo 100 caracteres.
- RN-04: Um modelo novo começa `Ativo`. As datas de criação e atualização são mantidas pelo sistema; uma
  edição ou mudança de status atualiza só a data de atualização.
- RN-05: O catálogo pertence à unidade. Os modelos de uma unidade não aparecem nem podem ser alterados
  por pessoas de outra unidade.
- RN-06: Só contas com perfil KP e o administrador da unidade podem consultar o catálogo completo,
  cadastrar, editar, ativar e inativar modelos. O KP atua no catálogo inteiro da sua unidade, não só nos
  modelos usados pelos seus times.
- RN-07: Os demais perfis (gerente, dev e outros) não acessam o catálogo. Eles veem um modelo só onde ele
  está referenciado: nos modelos de um projeto, no seletor de modelos ao criar ou importar projeto
  (somente modelos ativos) e nos resultados da aba Form Factor.
- RN-08: Um modelo não é excluído. Inativar tira o modelo do seletor de novos vínculos, mas preserva os
  projetos e resultados que já o referenciam e continua exibindo o modelo neles.
- RN-09: O item **Device models** aparece na navegação lateral, com o ícone de dispositivo, somente para
  quem pode gerenciar o catálogo (RN-06).
- RN-10: A listagem do catálogo segue o padrão universal de tabelas: 20 itens por página, filtros por
  nome e status, estados de carregamento, vazio e erro, e ações por linha.
- RN-11: Os modelos que já existem mantêm nome, status e vínculos. Eles ficam sem descrição.

## Critérios de aceite

- **CA-01:** Dado um KP, quando cadastra um modelo com nome e descrição válidos, então o modelo é criado
  `Ativo` na unidade dele, com datas de criação e atualização preenchidas, e aparece no catálogo.
- **CA-02:** Dado um KP, quando cadastra um modelo só com o nome, então o modelo é criado sem descrição.
- **CA-03:** Dado um modelo existente, quando um KP altera o nome ou a descrição, então os novos valores
  são exibidos, a data de atualização muda e a data de criação continua a mesma.
- **CA-04:** Dado um modelo ativo associado a um projeto, quando um KP o inativa, então ele deixa de
  aparecer no seletor de modelos de novos projetos e continua visível no projeto e nos resultados que já
  o referenciam.
- **CA-05:** Dado um modelo inativo, quando um KP o reativa, então ele volta a aparecer no seletor.
- **CA-06:** Dado um administrador da unidade, quando cadastra, edita, ativa ou inativa um modelo, então
  a operação é aceita como para o KP.
- **CA-07 (falha):** Dado um modelo com o nome `Galaxy S25` na unidade, quando alguém tenta cadastrar
  outro modelo ou renomear um modelo para ` Galaxy S25 `, então o sistema recusa e informa que o nome já
  existe.
- **CA-08 (falha):** Dado o cadastro ou a edição de um modelo, quando o nome está vazio ou só com espaços,
  passa de 100 caracteres, ou a descrição passa de 100, então o sistema recusa e informa o campo inválido.
- **CA-09 (falha):** Dado um gerente ou um dev, quando tenta consultar o catálogo, cadastrar, editar,
  ativar ou inativar um modelo, então a operação é recusada sem alterar nada.
- **CA-10 (falha):** Dado um KP, quando tenta editar um modelo de outra unidade ou um modelo que não
  existe, então o sistema informa que o modelo não foi encontrado, sem revelar dados de outra unidade.
- **CA-11:** Dado um gerente que cria ou importa um projeto, quando abre o seletor de modelos, então vê
  os modelos ativos da unidade e consegue associá-los ao projeto.
- **CA-12:** Dado um KP ou o administrador, quando abre a navegação lateral, então vê o item
  **Device models**; dado um gerente ou um dev, o item não aparece e o acesso direto ao endereço da tela
  informa que não há permissão.
- **CA-13:** Dado um catálogo com mais de 20 modelos, quando o KP abre a listagem, então vê 20 por
  página, pode filtrar por nome e status, e a tela informa quando nenhum modelo corresponde aos filtros.
- **CA-14:** Dados os modelos cadastrados antes desta spec, quando a mudança entra em vigor, então eles
  mantêm nome, status e vínculos com projetos e resultados, e ficam sem descrição.

## Fora de escopo

- Excluir um modelo fisicamente.
- Outros atributos de um modelo (fabricante, versão de Android, código interno, foto etc.).
- Um catálogo separado por time. O catálogo é um só por unidade.
- Importar modelos por planilha.
- Mudar o fluxo da spec 011 para associar modelos a projetos ou ler os modelos do relatório SDF.
- Histórico de alterações de cada modelo, além das datas de criação e atualização.

## Dúvidas em aberto

- Nenhuma.
