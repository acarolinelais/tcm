# 010. Modo mock do frontend: Spec

- **Status:** Concluída
- **Data:** 2026-10-23

## Problema
Quem clona o projeto precisa configurar API e PostgreSQL para explorar as telas administrativas, embora o
frontend já possua uma chave de configuração de mock e uma resposta estática para o Overview.

## Objetivo
Permitir que qualquer pessoa explore os fluxos de frontend disponíveis usando dados locais de demonstração,
sem iniciar os serviços de backend. As alterações devem permanecer disponíveis ao recarregar o navegador.

## Histórias de usuário
- Como pessoa desenvolvedora ou avaliadora, quero abrir o frontend em modo mock para conhecer as telas sem
  configurar serviços externos.
- Como pessoa avaliadora, quero criar e alterar dados de demonstração para explorar os fluxos administrativos.

## Regras de negócio
- **RN-01:** `VITE_USE_MOCK=true` usa os dados e operações locais; `false` usa a API real.
- **RN-02:** O primeiro acesso inicializa dados de demonstração no armazenamento do navegador.
- **RN-03:** O modo mock cobre as entidades e operações já disponíveis nas telas do frontend.
- **RN-04:** O modo mock não oferece autenticação ou persistência apropriadas para dados reais.

## Critérios de aceite
- **CA-01:** Dado o modo mock ativo, quando o frontend é iniciado sem API ou Postgres, então login e telas
  administrativas carregam com dados demonstrativos.
- **CA-02:** Dado o modo mock ativo, quando são criados ou alterados usuários, perfis, setores, gerentes,
  times ou membros, então as mudanças persistem após recarregar a página.
- **CA-03:** Dado o modo mock inativo, quando as telas fazem requisições, então o frontend continua usando a
  API real.
- **CA-04:** Dado um navegador com dados mock modificados, quando a chave `sdf.mock.database.v1` é removida,
  então a base demonstrativa inicial é recriada no próximo acesso.

## Fora de escopo
- Implementar dados ou operações para Board e Timeline, que ainda não possuem backend funcional.
- Simular as regras de autorização e validações do backend com fidelidade de produção.

## Dúvidas em aberto
- Nenhuma.
