# 045. Evidências anexadas ao Test Case: Spec

- **Status:** Rascunho
- **Data:** 2026-10-30

## Problema

Para provar um FAIL ou explicar um comportamento, o dev tira prints e logs, mas não tem onde guardá-los junto do
caso. As evidências ficam em pastas pessoais ou em chat, e a validação precisa pedir de novo.

## Objetivo

Quem trabalha no caso pode anexar arquivos de evidência (imagens, logs, vídeos curtos) e qualquer pessoa que vê
o caso pode abri-los.

## Histórias de usuário

- Como **dev**, quero anexar o print e o log de uma falha ao caso.
- Como **KP**, quero abrir as evidências antes de validar o caso.

## Regras de negócio

- RN-01: O painel e a página do caso ganham a seção Evidências, com nome, tamanho, quem enviou e quando.
- RN-02: Podem anexar o responsável principal, o Backup e a gestão no escopo. Pode ver e baixar quem vê o caso.
- RN-03: São aceitos apenas os formatos de imagem (PNG, JPG), texto e log (TXT, LOG), PDF, ZIP e vídeo MP4, com
  até 20 MB por arquivo e no máximo 20 arquivos por caso.
- RN-04: Quem enviou ou a gestão podem remover um anexo. A remoção pede confirmação.
- RN-05: As imagens podem ser visualizadas sem baixar. Os outros formatos são baixados.
- RN-06: Um arquivo de uma unidade nunca pode ser baixado por quem é de outra unidade, nem com o endereço
  direto.

## Critérios de aceite

- **CA-01:** Dado o dev responsável, quando anexa um PNG de 2 MB, então o arquivo aparece na lista e pode ser
  visualizado.
- **CA-02:** Dado um anexo, quando outra pessoa que vê o caso clica nele, então o arquivo é baixado.
- **CA-03:** Dado um anexo próprio, quando o autor remove e confirma, então o anexo some da lista.
- **CA-04 (falha):** Dado um arquivo de 25 MB, quando o dev tenta anexar, então o envio é recusado e informa o
  limite.
- **CA-05 (falha):** Dado um arquivo `.exe`, quando alguém tenta anexar, então o envio é recusado e informa os
  formatos aceitos.
- **CA-06 (falha):** Dado um dev sem relação com o caso, quando tenta anexar, então a ação não aparece e uma
  tentativa direta é recusada.
- **CA-07 (falha):** Dado o endereço de um anexo de outra unidade, quando alguém tenta baixá-lo, então o acesso
  é recusado.

## Fora de escopo

- Anexos em comentários, rodadas ou projetos.
- Edição ou anotação de imagens.
- Antivírus ou varredura de conteúdo (avaliar no plan).

## Dúvidas em aberto

- Onde guardar os arquivos (disco do servidor ou serviço de armazenamento)? Exige ADR.
- Os limites (20 MB, 20 arquivos) e os formatos atendem às evidências reais, como vídeos de teste?
- Por quanto tempo guardar as evidências de casos `Done`?
