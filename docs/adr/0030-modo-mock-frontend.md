# 0030. Modo mock persistido no frontend

- **Status:** Aceito
- **Data:** 2026-10-23
- **Decisores:** equipe TCM

## Contexto

Quem clona o projeto precisa conseguir explorar as telas administrativas sem configurar PostgreSQL e API.
O frontend já tinha um mock estático para o Overview e a variável `VITE_USE_MOCK`, mas as demais operações
continuavam chamando a API real.

## Decisão

- `VITE_USE_MOCK=true` seleciona implementações locais das APIs de autenticação, usuários, perfis/permissões,
  setores/gerentes, times/membros e Overview.
- O modo mock usa os mesmos contratos de resposta das APIs reais e grava os dados de demonstração em
  `localStorage`, permitindo explorar operações de leitura e escrita entre recarregamentos.
- O primeiro acesso cria uma base demonstrativa com uma unidade, contas em diferentes perfis, setores e times.
  Remover a chave `sdf.mock.database.v1` restaura os dados iniciais.
- `VITE_USE_MOCK=false` mantém o cliente HTTP e o backend reais. O mock é exclusivamente uma ferramenta de
  desenvolvimento local, sem segurança de autenticação ou armazenamento apropriado para dados reais.

## Consequências

- É possível iniciar o frontend sem Docker, Postgres ou API e experimentar os fluxos atualmente disponíveis.
- Cada módulo que adiciona operações persistidas deve fornecer a implementação mock equivalente quando seu
  fluxo precisar estar disponível no modo de demonstração.
- Os dados mock são isolados por navegador e não substituem testes de integração nem validações do backend.
