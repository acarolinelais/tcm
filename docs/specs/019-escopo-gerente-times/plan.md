# 019. Escopo do gerente nos times em que participa: Plan

- **Spec:** [spec.md](spec.md)
- **ADRs aplicados:** 0003, 0010, 0013, 0015, 0020, 0021, 0026, 0030, **0036**
- **ADRs novos propostos:** nenhum (o 0036 já foi aceito)

## Abordagem
A regra de escopo vira **uma** fonte no domínio, em `UsuarioAutenticado`, que já carrega `time_ids`
(participação ativa), `setores_gerenciados` e `times_gerenciados` (times dos setores). Dois métodos:
`time_no_escopo(time_id, setor_id)` para checar um time e `times_no_escopo` para filtrar listagens. Os
services de projeto, Test Case, Form Factor, importações e membros passam a usar esses métodos no lugar das
cópias locais. A administração da composição do time (`TimeService._garantir_gestao_time`, criar time no
setor) **não muda**: continua exigindo o setor (RN-04). Não há mudança de schema, migration nem contrato
de API; só muda quem recebe 200 em vez de 403/404. No frontend, o detalhe do time passa a abrir (só leitura)
para o gerente que participa, e o modo mock replica a regra (ADR 0030).

## Regra no domínio
```python
# src/domain/common/usuario_autenticado.py
def time_no_escopo(self, time_id: UUID, setor_id: UUID) -> bool:
    if self.eh_administrador:
        return True
    if self.perfil_codigo == "GERENTE" and setor_id in self.setores_gerenciados:
        return True
    return time_id in self.time_ids  # gerente que participa, KP e Developer

@property
def times_no_escopo(self) -> tuple[UUID, ...]:
    if self.perfil_codigo == "GERENTE":
        return tuple(dict.fromkeys((*self.times_gerenciados, *self.time_ids)))
    return self.time_ids
```
Para KP e Developer o resultado é idêntico ao de hoje (`time_id in time_ids`), o que mantém a RN-06. A
checagem de perfil (quem pode criar/gerenciar: só `GERENTE`/`KP`) e de permissão (`pode(...)`) continua
nos services, separada do escopo.

## Modelo de dados
Sem alterações.

## Contrato da API
Sem rotas ou payloads novos. Mudança de comportamento para o perfil `GERENTE` que participa do time:

| Rota | Antes | Depois |
|---|---|---|
| `GET /api/projetos` | não listava projetos de times só por participação | lista |
| `POST/PUT /api/projetos`, importação por planilha | 403 | 201/200 |
| `GET/POST/PATCH` de Test Cases e transferência | 404/403 | 200/201 |
| `GET /api/times/{id}/membros` | 404 | 200 |
| `GET /api/times` | só times dos setores | times dos setores + times em que participa |
| `POST /api/projetos/{id}/relatorios-sdf`, `GET .../form-factor` | importação 404; consulta já liberada | 201/200 |
| Adicionar/remover membro, mudar papel, editar/inativar time | 403 | **403 (sem mudança)** |

## Backend: arquivos
- `domain/common/usuario_autenticado.py`: `time_no_escopo` e `times_no_escopo`.
- `application/services/projeto_service.py`: `_validar_escopo_time`, `_times_no_escopo` e
  `_time_esta_no_escopo` delegam para o `UsuarioAutenticado` (mantendo a exigência de perfil
  `GERENTE`/`KP` para criar e gerenciar). A importação por planilha já reusa `_validar_escopo_time`.
- `application/services/caso_teste_service.py`: `_time_esta_no_escopo` delega (a importação SDF reusa).
- `application/services/form_factor_service.py`: troca a condição local pelo método.
- `application/services/time_service.py`: `listar_membros` aceita o gerente com o time no escopo;
  `listar` usa `times_no_escopo` para o gerente. `_garantir_gestao_time` fica como está.

## Frontend: arquivos
- `modules/times/TimeDetalhePage.tsx`: `escopoPermitido` inclui o gerente que participa do time;
  `podeGerenciarMembros` continua exigindo o setor.
- `core/mock/database.ts`: `projectInMockScope`, `canManageMockTeam` (usado na criação de projeto e nos
  Test Cases) e `mockTimesApi.listar` incluem a participação do gerente. As funções que alteram a
  composição do time continuam exigindo o setor.
- A área de Projetos não muda: os botões dependem do perfil e das permissões, e os dados vêm da API.

## Critérios de aceite → testes
| CA | Nível | Teste |
|---|---|---|
| CA-01..10 (base) | Unidade | `test_usuario_autenticado.py`: gerente por setor, por participação, sem relação; KP e Developer inalterados; admin; `times_no_escopo` sem duplicados |
| CA-01 | Unidade | `test_projeto_service.py`: `test_gerente_membro_lista_projetos_do_time` |
| CA-02, CA-03 | Unidade | `test_caso_teste_service.py`: `test_gerente_membro_consulta_e_gerencia_casos_do_time` |
| CA-02, CA-04 | Unidade | `test_time_service.py`: `test_gerente_membro_lista_membros_do_time` |
| CA-04 | Unidade | `test_form_factor_service.py`: `test_gerente_membro_consulta_form_factor` |
| CA-05 | Unidade | `test_projeto_service.py`: `test_gerente_membro_cria_projeto_no_time`; `test_time_service.py`: `test_gerente_lista_times_do_setor_e_em_que_participa` |
| CA-06 | Unidade | testes existentes do gerente por setor seguem verdes |
| CA-07 | Unidade | `test_gerente_fora_do_setor_nao_cria_caso` (existente), `test_gerente_ou_kp_fora_do_escopo_nao_cria_projeto` (existente), `test_gerente_sem_relacao_nao_lista_membros` |
| CA-08 | Unidade | `test_gerente_membro_nao_gerencia_composicao_do_time` |
| CA-09 | Unidade | `test_gerente_membro_sem_permissao_nao_cria_caso` |
| CA-10 | Integração | `test_isolamento_tenant.py` (existente) segue verde |
| CA-02, CA-03, CA-07 | Funcional | `test_casos_teste_api.py`: gerente membro recebe 200 e gerente sem relação 404 |
| CA-02 | Unidade (front) | `TimeDetalhePage.test.tsx`: gerente membro vê o detalhe sem ações de gestão |
| CA-01, CA-05 | Unidade (front) | `database.test.ts`: gerente membro lista o projeto e o time no mock |

Sem e2e novo: os e2e deste repositório simulam a API com rotas falsas, então não exercitariam a regra de
escopo, que vive no backend. A regra fica coberta por testes de unidade e funcionais.

## Riscos e decisões pendentes
- **Ampliação de acesso:** um gerente adicionado a um time de outro setor ganha gestão dos projetos
  desse time. É o comportamento decidido no ADR 0036.
- **Área de Times:** o gerente passa a ver, na listagem de Times, os times em que participa. As ações de
  gestão já são escondidas por linha (`podeGerenciarTime` usa `setores_gerenciados`), e o backend recusa.
- **Sessão:** o escopo vem do estado persistido a cada requisição (`get_usuario_atual` recalcula
  `time_ids`), e adicionar/remover membro já invalida as sessões. Nada novo a fazer.
