# Associação, paginação e cache no fluxo do dev

- **Data:** 2026-10-24
- **Spec:** [012 — Perfil Dev em Projetos e Test Cases](../specs/012-perfil-dev-projetos-test-cases/spec.md)
- **Tags:** autorização, SQL, paginação, cache, testes

Um Test Case associado ao dev é aquele em que ele é responsável principal ou backup. A associação recorta a consulta, mas não concede permissão para editar: a posse da ação continua sendo verificada separadamente.

Aplicar esse recorte antes de contar e paginar evita páginas vazias artificiais e totais incorretos. Na consulta de projetos, `EXISTS` identifica pelo menos um caso associado sem repetir o projeto quando há vários casos. O filtro de unidade e o escopo dos times continuam obrigatórios.

O cache também tem contexto: usuário, unidade, projeto, paginação e filtros precisam distinguir consultas pessoais. Transferir o último caso de um projeto invalida tanto os casos quanto as opções do seletor e o destino de entrada. Uma falha de atualização pode preservar dados antigos no TanStack Query; a apresentação deve priorizar o erro para não continuar exibindo dados após uma resposta de acesso negado.

Os testes de componentes cobriram repetição de página seguinte, tradução e cache antigo. As jornadas com API real confirmaram o encaminhamento, a consulta como backup e as recusas de edição e transferência, complementando os testes de SQL com PostgreSQL.
