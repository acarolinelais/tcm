# 0010. Estratégia de testes

- **Status:** Aceito
- **Data:** 2026-10-22

## Contexto
O código é gerado com apoio de IA, e os testes são a forma objetiva de verificar que ele faz o que a spec pede,
inclusive que **rejeita** o que deve rejeitar.

## Decisão
Cinco tipos de teste. **Todo recurso tem, em cada nível, pelo menos um cenário de sucesso e um de falha.**
O cenário de falha verifica que o sistema rejeita a entrada ou o estado inválido: o teste passa
porque o erro esperado aconteceu.

| Nível | Onde / ferramentas | O que cobre | Sucesso (ex.) | Falha (ex.) |
|---|---|---|---|---|
| Unidade | `backend/tests/unit`: pytest | Entidades, validações e services com repositórios dublados | Criar usuário válido chama `adicionar` + `commit` | E-mail inválido levanta erro de validação e **não** chama `commit` |
| Integração | `backend/tests/integration`: pytest + testcontainers-python (Postgres) | Repositórios, models e migrations contra um banco real | Salvar e listar paginado | E-mail duplicado viola o índice único |
| Funcional | `backend/tests/functional`: `httpx.AsyncClient` + app FastAPI + Testcontainers | Requisição HTTP → resposta, com a API inteira | `POST` → 201 + `Location` | Payload inválido → 422; `page_size=101` → 422; id inexistente → 404 |
| Ponta a ponta | `frontend/e2e`: Playwright | Fluxos do usuário no navegador, com API e banco reais | Cadastrar usuário e vê-lo na tabela | Form vazio mostra erros e não cria registro |
| Arquitetura | `backend/tests/architecture`: import-linter | Regras de dependência do ADR 0003 | `domain` não importa SQLAlchemy/FastAPI/outras camadas | (falha se alguém violar) |

Frontend (unidade/componente): **Vitest** + Testing Library, também com sucesso e falha.

Convenções:
- Nome do teste: `test_<metodo>_<cenario>_<resultado>` (ex.: `test_criar_email_invalido_levanta_validacao`).
- Estrutura AAA (Arrange, Act, Assert).
- Os critérios de aceite da spec viram testes. O `tasks.md` aponta qual teste cobre cada critério.
- Uma task só termina com `uv run pytest` / `npm test` verdes.

## Alternativas consideradas
- **unittest puro:** mais verboso; o pytest tem fixtures e asserts mais enxutos.
- **Banco SQLite em memória nos testes:** não reproduz constraints nem SQL reais do Postgres.
- **Só testes de unidade:** não pegam erros de mapeamento, de migrations nem de HTTP.

## Consequências
- ✅ Cada camada tem uma rede de segurança, e os cenários de falha documentam as regras.
- ⚠️ Testes de integração e funcionais exigem Docker e são mais lentos.
