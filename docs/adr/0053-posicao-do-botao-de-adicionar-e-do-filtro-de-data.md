# 0053. Posição do botão de adicionar e do filtro de data

- **Status:** Proposto
- **Data:** 2026-11-07

## Contexto
Cada tela decidiu sozinha onde pôr o botão de adicionar e o filtro de data. O "New project" era uma pílula, e o
botão equivalente das outras listagens tinha a forma padrão. No detalhe do projeto, o filtro de semana ficava no
cabeçalho, ao lado do título; na General Results, o mesmo filtro ficava na linha das abas, junto com as ações.
Quem passa de uma tela para outra precisa procurar o controle de novo.

## Decisão
- **Adicionar** (criar ou importar uma entidade) é o botão primário, com a forma padrão do HeroUI e o ícone `Plus`
  (ou o ícone da ação, como `Download` na importação). É sempre a **última ação à direita** da linha em que está:
  - no **cabeçalho da página**, à direita do título, quando a ação vale para a página inteira (Users, Teams,
    Sectors, Device models, Profiles, Projects);
  - no **fim da linha das abas**, quando a ação é de uma aba (New test case, Import SDF report).
- **Filtro de data** (dia ou semana) fica na **linha de ferramentas** da lista, que é a linha das abas ou a barra
  acima da tabela. Ele vem junto com os outros filtros (Closed projects) e antes das ações. Nunca fica no cabeçalho,
  ao lado do título.

```tsx
<PageTabs
  actions={<>
    <WeekPickerHero label={t("week")} value={semana} onChange={setSemana} />          {/* filtros primeiro */}
    {podeCriar && <Button variant="primary" onPress={abrir}><Plus />{t("newTestCase")}</Button>}  {/* adicionar por último */}
  </>}
/>
```

Fora desta regra:
- os filtros de data por coluna da tabela (Auditoria), que seguem as regras de tabela (skill `table-rules`);
- a navegação de período da Timeline (setas, Hoje, Dia/Semana/Mês), que muda a grade e não filtra uma lista.

## Alternativas consideradas
- **Filtro de data no cabeçalho, ao lado do título, em todas as telas:** deixa o filtro visível mesmo sem abas, mas o
  separa dos outros filtros e das ações que ele afeta, e na General Results o cabeçalho não tem espaço para isso.
- **Botão de adicionar sempre no cabeçalho, inclusive o das abas:** fica num lugar só, mas o "New test case" não vale
  para a aba Form Factor e teria de aparecer e sumir no cabeçalho conforme a aba.

## Consequências
- ✅ Em toda tela, o botão de adicionar está no mesmo canto, e os filtros de data ficam ao lado dos outros filtros.
- ⚠️ No detalhe do projeto, o filtro de semana sai do cabeçalho e desce para a linha das abas; quem já usava a tela
  vai procurá-lo uma vez.
