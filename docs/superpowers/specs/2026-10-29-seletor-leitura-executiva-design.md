# Seletor editorial e leitura executiva do dashboard

> **Decisão posterior (29/10/2026):** a faixa com os cards “Onde agir”, “Base analisada” e “Movimento recente” foi removida após avaliação visual. O seletor editorial personalizado permanece como solução aprovada.

## Intenção

Substituir o menu nativo de estabelecimento por uma bandeja coerente com o
redesign Executivo editorial e acrescentar uma síntese curta que ajude o gestor
a decidir onde agir. A mudança deve apresentar melhor dados que já existem, sem
criar endpoints, inferências novas ou indicadores que aparentem precisão maior
do que a amostra permite.

## Objetivos

- Tornar a troca entre visão consolidada e loja individual visualmente coerente.
- Permitir reconhecer a situação de cada loja antes de selecioná-la.
- Responder no topo do painel: onde agir, qual é a base analisada e o que mudou
  na coleta mais recente.
- Preservar uso por teclado, leitor de tela, movimento reduzido e largura de
  320 px.

## Não objetivos

- Criar ranking competitivo entre lojas.
- Alterar a forma de cálculo da satisfação ou dos aspectos.
- Tratar a cobertura textual como garantia estatística da opinião de todos os
  clientes.
- Criar séries históricas ou tendências sem dados persistidos para isso.

## Abordagens consideradas

### 1. Somente estilizar o seletor nativo

Mantém o comportamento do navegador e o menor risco técnico, mas a bandeja
aberta continua usando o visual do sistema operacional e não comporta contexto
por loja.

### 2. Seletor próprio com ranking entre lojas

Permite comparação rápida, mas com poucas lojas cria pouco valor e pode induzir
uma leitura superficial de melhor e pior unidade.

### 3. Seletor próprio com orientação para ação — escolhida

Apresenta contexto por loja e um resumo executivo do escopo selecionado. A
prioridade é ajudar o gestor a agir sobre problemas sustentados por menções,
mantendo comparações detalhadas nos indicadores já existentes.

## Seletor de estabelecimento

O campo atual será substituído por um componente de seleção próprio:

- o acionador mostra o nome do escopo atual e um resumo compacto;
- a opção consolidada mostra quantidade de lojas e comentários analisados;
- cada loja mostra nome, estado da coleta, comentários analisados, satisfação
  textual e nota do Google quando disponível;
- a opção escolhida recebe marca textual e visual;
- a bandeja fecha ao selecionar, clicar fora ou pressionar `Escape`;
- setas, `Home`, `End`, `Enter` e `Espaço` funcionam por teclado;
- o controle usa os papéis `combobox`, `listbox` e `option`, com foco devolvido
  ao acionador após o fechamento.

Não haverá busca textual nesta versão: o número atual de lojas não justifica
mais um campo e a bandeja deve permanecer direta.

## Leitura executiva

Uma faixa de três blocos será exibida abaixo do escopo:

### Onde agir

Seleciona o aspecto com menor percentual de menções positivas entre aqueles
com pelo menos 10 menções, o mesmo limite já utilizado nos insights. Exibe nome,
percentual e número de menções. Quando nenhum aspecto atinge o limite, informa
que ainda não há base suficiente, sem apontar um problema artificial.

### Base analisada

Exibe a quantidade de comentários efetivamente analisados e, quando disponível,
o total de avaliações informado pelo Google. A relação é chamada de
**cobertura textual indicativa** e recebe uma explicação de que o total do Google
também pode incluir avaliações sem comentário.

### Movimento recente

Exibe a soma de avaliações novas encontradas na última coleta das lojas do
escopo e a data da atualização bem-sucedida mais recente. Não usa o termo
“tendência”, pois uma única coleta não forma série histórica.

## Estados e apresentação

- Sem avaliações: os três blocos explicam qual dado ainda falta.
- Carregando: skeleton com a mesma geometria da faixa final.
- Visão consolidada: os cálculos usam somente as lojas pertencentes ao usuário.
- Loja individual: os cálculos e textos se restringem à loja escolhida.
- Visual: superfícies marfim, regras finas, tipografia tabular e acentos em verde,
  âmbar ou vermelho acompanhados por texto e ícone.

## Validação

- Testes unitários para cálculo da prioridade, cobertura e atualização recente.
- Testes do seletor para abertura, seleção, `Escape`, navegação por setas e nomes
  acessíveis.
- Atualização do Playwright para operar o novo `combobox` em 320 px.
- Execução de lint, Vitest, build, E2E e smoke Docker antes da integração.
