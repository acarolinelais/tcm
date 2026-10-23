# 0015. Autorização e papéis (RBAC)

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
Com a hierarquia da Unidade (ADR 0013) e o login (ADR 0014) decididos, falta a regra de quem pode ver,
editar e transferir o quê. O diagrama do usuário define papéis e regras específicas sobre as tasks
(Casos de Teste, TCs — já aparecem como números no dashboard Overview: Completed/Assigned/In
Progress/All). Além do que o diagrama original mostrava, o usuário acrescentou dois pontos: um gerente
com múltiplos times precisa de uma visão por time **e** uma visão unificada de todos os times que lidera;
e existe um quarto papel, **KP (Key Person)**, que gerencia tasks como um gerente, mas só dentro do
**único** time em que ele está inserido.

## Decisão
**Quatro papéis fixos**, guardados como `papel` em `TimeMembro` ou em `Time.gerente_id`/`Unidade`
conforme o escopo de cada um — não existe tabela de permissões genérica, os papéis são enumerados em
código:
```python
class Papel(StrEnum):
    ADMIN_UNIDADE = "admin_unidade"  # gerencia setores, times e usuários da própria Unidade
    GERENTE = "gerente"              # cadastra/gerencia os times que lidera (Time.gerente_id)
    KP = "kp"                        # gerencia tasks só do time em que é membro (TimeMembro.papel)
    DEV = "dev"                      # membro comum de um ou mais times (TimeMembro.papel)
```
`TimeMembro` ganha a coluna `papel` (`kp` ou `dev`) — é o mesmo vínculo N:N do ADR 0013, só com um campo
a mais para dizer se aquele membro é o KP daquele time específico. Nada impede, em tese, mais de um KP
por time; o modelo não força unicidade — se isso for necessário, vira uma regra de negócio no service
(`garantir_kp_unico_no_time`), não uma constraint de banco, pra manter a opção aberta sem ADR novo.

**Regras sobre `Task`** (aplicadas no service, nunca só no frontend):
- Um `dev` vê as tasks atribuídas a ele **e** todas as tasks dos times de que é membro (visão de time é
  mais ampla que a visão individual).
- Um `dev` só **edita** a task que está atribuída a ele mesmo.
- O `dev` dono de uma task pode **transferi-la** para qualquer outro membro do mesmo time (atualiza
  `Task.atribuido_a_usuario_id`); não pode transferir para alguém fora do time.
- `gerente` vê e edita todas as tasks dos times que gerencia; cadastra tasks novas para esses times;
  **atribui e transfere** qualquer task entre quaisquer membros de qualquer time que lidera (não precisa
  ser o dono da task, ao contrário do `dev`).
- `gerente` com mais de um time consulta a listagem de tasks de **duas formas**: filtrada por
  `time_id` (visão de um time só) ou sem esse filtro, agregando todos os times que ele lidera (visão
  unificada). Isso é um parâmetro de consulta no service (`listar(gerente_id, time_id: UUID | None)`),
  não dois endpoints nem dois papéis.
- `kp` tem exatamente os mesmos poderes de `gerente` sobre tasks (atribuir, editar, transferir entre
  quaisquer devs do time, cadastrar tasks novas) — mas **só dentro do time em que ele é membro**. Um KP
  de dois times diferentes teria duas linhas em `TimeMembro` com `papel = kp`, cada uma só valendo pro
  seu próprio time; não existe visão unificada pro KP, porque o escopo dele já é um time só.
- `admin_unidade` vê e edita tudo dentro da própria Unidade.

**Enforcement:** uma exceção de domínio nova, `ForbiddenException` (`domain/common/exceptions.py`),
mapeada pelo handler (ADR 0006) para **403** ProblemDetails. As checagens de posse/papel ficam no
service, não no router (mesmo padrão do ADR 0003: router fino, regra no `application`):
```python
async def transferir(self, task_id: UUID, novo_dev_id: UUID, usuario_atual: UsuarioAutenticado) -> None:
    task = await self._obter_entidade(task_id)
    pode_gerenciar_o_time = await self._repo_time.e_gerente_ou_kp(task.time_id, usuario_atual.id)
    if not pode_gerenciar_o_time and task.atribuido_a_usuario_id != usuario_atual.id:
        raise ForbiddenException("Só o dono da task, o gerente ou o KP do time podem transferi-la.")
    if not await self._repo_time.tem_membro(task.time_id, novo_dev_id):
        raise ConflictException("O novo responsável precisa ser do mesmo time.")
    ...
```

## Alternativas consideradas
- **Tabela de permissões genérica (ação × recurso × papel), configurável em runtime:** flexível demais
  pra quatro papéis fixos e regras conhecidas hoje; adiciona uma camada de indireção sem necessidade atual.
- **Checar permissão só no frontend (esconder botões):** não é autorização, é só UX — qualquer chamada
  direta à API furaria a regra. A checagem no frontend continua existindo, mas como complemento, não
  como a defesa real.
- **KP como papel à parte de `TimeMembro`, com tabela própria:** o KP é, antes de tudo, um membro do
  time (aparece na listagem de devs, pode ter tasks atribuídas a ele também); herdar de `TimeMembro` com
  uma coluna `papel` evita duplicar o vínculo pessoa↔time em duas tabelas diferentes.
- **Um papel só por Unidade (sem granularidade por Time/Setor):** mais simples, mas não expressa "gerente
  só dos times que lidera", "dev só dos times de que participa" nem "KP só do próprio time" — não atende
  o diagrama.

## Consequências
- ✅ Quatro papéis cobrem exatamente o que o diagrama (e o ajuste do usuário) pedem, sem engenharia de
  permissão genérica demais.
- ✅ KP reaproveita a tabela `TimeMembro` do ADR 0013 — só uma coluna nova, sem nova entidade.
- ✅ `ForbiddenException` → 403 segue o mesmo padrão de erro único do ADR 0006; o frontend já sabe tratar.
- ⚠️ Um quinto papel (ou uma permissão por ação mais fina) exige um ADR novo — `StrEnum` fixo não
  comporta configuração em runtime.
- ⚠️ Toda regra de posse ou de papel de time (`gerente`/`kp`) precisa ser testada explicitamente por
  entidade nova que seguir este padrão; é fácil esquecer uma checagem em um service novo.
- ⚠️ Como o modelo não impõe um KP único por time, uma regra de negócio futura que exija isso (se vier a
  existir) precisa ser adicionada no service, sem depender de uma constraint do banco.
