# 022. Deploy inicial: Spec

- **Status:** Aprovada
- **Data:** 2026-10-24
- **ADRs relacionados:** 0005, 0011, 0012, 0014, 0027, 0028

## Problema

Hoje o sistema só roda na máquina de quem desenvolve: o banco sobe em contêiner, mas a API e o frontend
precisam ser iniciados à mão, com ferramentas de desenvolvimento instaladas. Não existe uma forma
repetível de colocar o sistema num servidor para os times usarem, nem de atualizá-lo depois de um merge.

## Objetivo

Empacotar API e frontend em imagens próprias e permitir que um servidor suba o sistema completo (banco,
API e frontend) com um único comando, que volte sozinho depois de falhas ou reinícios. O ambiente de
desenvolvimento continua como está: só o banco em contêiner.

## Histórias de usuário

- Como **operador do servidor**, quero subir e atualizar o sistema com um comando para não depender de
  passos manuais nem de ferramentas de desenvolvimento instaladas.
- Como **operador do servidor**, quero que o sistema volte sozinho depois de uma queda ou de um reinício
  da máquina para que os times não fiquem sem acesso.
- Como **pessoa desenvolvedora**, quero continuar subindo só o banco localmente, como hoje.
- Como **time do projeto**, quero que um PR que quebre o empacotamento falhe na verificação contínua, e
  não no momento do deploy.

## Regras de negócio

- RN-01: O ambiente de desenvolvimento local sobe apenas o banco, com o mesmo comando e as mesmas
  configurações de hoje.
- RN-02: O ambiente de produção sobe banco, API e frontend juntos. Cada serviço reinicia sempre que
  parar, inclusive depois de um reinício do servidor.
- RN-03: A API só começa a atender depois que o banco está pronto, e aplica as migrations pendentes ao
  iniciar (ADR 0012).
- RN-04: Em produção, o navegador acessa o sistema por um único endereço: o frontend responde às páginas e
  encaminha as chamadas da API. A API e o banco não ficam acessíveis diretamente de fora do servidor.
- RN-05: Qualquer endereço de página do sistema pode ser aberto diretamente ou recarregado no navegador
  sem erro.
- RN-06: Segredos e senhas de produção (assinatura dos tokens, senha do banco, senha do administrador
  inicial e senha inicial de usuários) vêm de configuração do servidor, nunca do repositório. Sem um
  deles, o ambiente de produção não sobe.
- RN-07: Em produção, o frontend sempre usa a API real; o modo mock (ADR 0030) não fica disponível.
- RN-08: Os dados do banco de produção sobrevivem a reinícios e atualizações dos serviços.
- RN-09: A atualização em produção é feita no próprio servidor, a partir do código da branch publicada:
  obter a versão nova e reconstruir os serviços com o mesmo comando de subida.
- RN-10: A verificação contínua de cada PR confirma que as imagens da API e do frontend continuam sendo
  construídas.

## Critérios de aceite

- **CA-01:** Dado um servidor apenas com o motor de contêineres instalado e a configuração de produção
  preenchida, quando o operador executa o comando de subida de produção, então banco, API e frontend
  ficam saudáveis e o login do sistema abre no navegador pelo endereço do servidor.
- **CA-02:** Dado o sistema de produção no ar, quando o navegador abre ou recarrega diretamente uma página
  interna (por exemplo, o detalhe de um projeto), então a página carrega normalmente.
- **CA-03:** Dado o sistema de produção no ar, quando o navegador faz login e navega pelas telas, então
  todas as chamadas da API passam pelo mesmo endereço do frontend e respondem sem erro de origem.
- **CA-04:** Dado o sistema de produção no ar, quando a API ou o frontend param inesperadamente, ou o
  servidor reinicia, então os serviços voltam sozinhos, sem ação do operador.
- **CA-05:** Dado dados cadastrados em produção, quando os serviços são reiniciados ou reconstruídos numa
  atualização, então os dados continuam disponíveis.
- **CA-06:** Dado o banco ainda iniciando, quando o ambiente de produção sobe, então a API aguarda o banco
  ficar pronto, aplica as migrations e só então passa a responder.
- **CA-07 (falha):** Dada uma configuração de produção sem algum segredo obrigatório, quando o operador
  tenta subir o ambiente, então a subida é interrompida e informa qual configuração está faltando.
- **CA-08 (falha):** Dado o ambiente de produção no ar, quando alguém tenta acessar a API ou o banco
  diretamente pela rede, sem passar pelo frontend, então a conexão não é aceita.
- **CA-09:** Dado o frontend de produção, quando a aplicação carrega, então ela usa a API real, mesmo que
  a configuração de desenvolvimento do repositório esteja em modo mock.
- **CA-10:** Dada uma máquina de desenvolvimento, quando a pessoa usa o comando de hoje para subir o
  ambiente local, então apenas o banco sobe, com as mesmas configurações de antes.
- **CA-11 (falha):** Dado um PR que quebra a construção da imagem da API ou do frontend, quando a
  verificação contínua roda, então ela falha e aponta qual imagem não foi construída.

## Fora de escopo

- HTTPS, domínio e certificados. Até existirem, o acesso ao sistema deve ficar restrito à rede interna.
- Publicação de imagens em um registro e deploy automático a partir do CI.
- Backup, restauração e replicação do banco de produção.
- Monitoramento, alertas e centralização de logs.
- Mais de uma instância da API ou balanceamento de carga.
- Kubernetes ou outra orquestração além do Compose.
- Ambientes intermediários (homologação, staging).

## Dúvidas em aberto

- Qual porta do servidor o frontend deve expor? Proposta: 80, configurável.
- O texto do `CLAUDE.md` que proíbe expor a API fora do ambiente local passa a dizer "somente rede
  interna até existir HTTPS"? Proposta: sim, atualizado nesta spec.
