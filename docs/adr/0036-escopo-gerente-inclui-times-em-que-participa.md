# 0036. Escopo do gerente inclui os times em que ele participa

- **Status:** Aceito
- **Data:** 2026-10-25
- **ADRs relacionados:** 0015, 0021, 0026

## Contexto
O ADR 0021 limita o gerente aos setores com associação ativa (`SetorGerente`). Na prática, os
serviços aplicam regras diferentes. Consultar projetos e o Form Factor também aceita o gerente que só
participa do time (`TimeMembro`). Já Test Cases, a lista de membros do time e a gestão de projetos
exigem o setor. Resultado: um gerente que é membro do time abre o projeto e vê os resultados, mas não
vê os Test Cases nem quem é responsável por eles. Com a área de Projetos, o gerente precisa
acompanhar e gerenciar tudo dos projetos dos times em que trabalha, mesmo que o setor seja gerenciado
por outra pessoa.

## Decisão
**O escopo do gerente é a união de dois conjuntos: os times dos setores que ele gerencia e os times
em que ele participa ativamente.** Dentro desse escopo, o gerente tem os mesmos poderes em todos os
casos.

- Um time está no escopo do gerente quando `time.setor_id in setores_gerenciados` **ou**
  `time.id in time_ids` (vínculo `TimeMembro` ativo).
- Nesse escopo, sempre combinado com a permissão do perfil (ADR 0015), o gerente:
  - cria, consulta e gerencia projetos;
  - consulta e gerencia Test Cases e suas atribuições (responsável e backup);
  - consulta os membros do time (os responsáveis pelos Test Cases);
  - consulta e importa resultados Form Factor.
- A administração da estrutura não muda: criar times no setor e administrar membros e papéis
  continua exigindo a associação ao setor (ADR 0021). Participar de um time não dá ao gerente o poder
  de mudar quem está nele.
- A regra fica num único helper de escopo, usado por todos os serviços, em vez de uma cópia em cada
  service:

```python
def time_no_escopo_do_gerente(usuario: UsuarioAutenticado, time: Time) -> bool:
    return time.setor_id in usuario.setores_gerenciados or time.id in usuario.time_ids
```

## Alternativas consideradas
- **Manter só os setores gerenciados (ADR 0021) e retirar o acesso por participação de Projetos e
  Form Factor:** a regra fica consistente, mas o gerente que trabalha num time de outro setor perde o
  acompanhamento do próprio projeto, que é justamente o uso pedido.
- **Dar ao gerente acesso a toda a unidade:** resolve o caso, mas iguala o gerente ao administrador
  da unidade e expõe projetos de times com os quais ele não tem relação.
- **Liberar só a consulta (sem gestão) nos times em que o gerente participa:** criaria um terceiro
  nível de acesso para o mesmo perfil, e o gerente precisa gerenciar as atribuições desses projetos.

## Consequências
- ✅ Uma regra só para o gerente em Projetos, Test Cases, membros e Form Factor; a tela deixa de
  mostrar o projeto pela metade.
- ✅ Incluir o gerente num time passa a ser a forma explícita de dar a ele acesso aos projetos
  daquele time, sem mexer na gestão do setor.
- ⚠️ O gerente ganha gestão de projetos e Test Cases em times de setores que ele não gerencia. Quem
  adiciona um gerente a um time precisa saber disso.
- ⚠️ Os serviços que hoje checam só o setor (Test Cases, membros do time, gestão de projetos) precisam
  ser alterados e testados de novo, com cenários de sucesso e de falha para cada caminho de acesso.
- ⚠️ Mudar a participação do gerente num time muda o acesso dele. Adicionar ou remover membros já
  invalida as sessões da pessoa (ADRs 0020 e 0021), e essa regra precisa continuar valendo.
