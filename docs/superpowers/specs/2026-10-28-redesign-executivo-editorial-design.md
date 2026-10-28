# Redesign Executivo Editorial do NEXO

## Intenção

Unificar o aplicativo NEXO em uma identidade visual profissional, legível e
memorável para dois públicos simultâneos: gestores que precisam interpretar os
dados sem esforço e a banca do TCC, que deve perceber maturidade técnica e de
produto. A reformulação não altera a lógica de coleta, análise de sentimentos,
autenticação ou persistência; ela reorganiza e apresenta melhor o que o sistema
já faz.

## Objetivos

- Aplicar a direção **Executivo editorial** a login, cadastro, navegação,
  dashboard, lojas, avaliações, insights e modais.
- Criar hierarquia clara entre contexto da loja, indicadores, avaliações e
  análises por aspecto.
- Tornar estados de coleta, carregamento, erro, vazio e atualização imediatamente
  compreensíveis.
- Usar animações curtas e funcionais que comuniquem mudança de estado e deem
  sensação de qualidade, respeitando `prefers-reduced-motion`.
- Preservar responsividade, acessibilidade por teclado e contratos atuais da API.

## Não objetivos

- Criar novos endpoints, métricas ou funcionalidades de inteligência artificial.
- Alterar regras de negócio, textos científicos, extração de aspectos ou modelo
  BERTimbau.
- Adicionar modo escuro ou múltiplos temas nesta etapa.
- Introduzir uma biblioteca de componentes externa ou dependência visual pesada.

## Antiobjetivos

- Não transformar o painel em uma interface excessivamente animada ou com efeito
  de “site promocional”.
- Não esconder informações importantes dentro de interações difíceis de descobrir.
- Não depender apenas de cor para comunicar positivo, neutro, negativo ou status.
- Não sacrificar legibilidade para deixar a tela mais densa.

## Restrições

- Manter React 19, TypeScript, Tailwind CSS, Framer Motion, Recharts e Lucide.
- Reutilizar os componentes e testes existentes sempre que possível.
- Não alterar formatos de resposta da API.
- Manter todas as telas utilizáveis a partir de 320 px.
- Evitar fontes ou recursos remotos indispensáveis; a tipografia deve ter bons
  fallbacks locais.

## Abordagens consideradas

### 1. Troca cosmética de tema

Substituir cores, sombras e raios sem reorganizar componentes. É a opção mais
rápida e de menor risco, mas mantém a hierarquia irregular dos cartões de loja e
a diferença estrutural entre autenticação e dashboard.

### 2. Dashboard primeiro

Reformular apenas o painel principal e preservar as demais telas. Entregaria o
maior impacto na demonstração com esforço intermediário, porém deixaria login,
cadastro, lojas e modais com identidades diferentes.

### 3. Experiência completa e coesa — escolhida

Criar tokens globais e aplicar a mesma linguagem a todas as jornadas, ajustando
hierarquia e microinterações sem mudar comportamento. É um trabalho maior, mas
resolve a inconsistência visual pela raiz e deixa a demonstração contínua do
login à leitura das avaliações. Esta escolha foi assumida após o usuário pedir
para continuar com a direção Executivo editorial para o aplicativo.

## Direção visual

### Personalidade

Séria sem ser fria, contemporânea sem parecer um template genérico. A assinatura
visual é o contraste entre superfícies marfim e uma “tinta” verde-marinho, com
verde de satisfação usado de forma econômica. Regras finas, pequenos rótulos em
caixa alta e números grandes dão o caráter editorial.

### Tokens propostos

- Fundo: marfim frio (`#F4F3ED`) com gradientes muito discretos.
- Tinta principal: verde-marinho (`#13201D`).
- Texto secundário: cinza esverdeado (`#66736D`).
- Superfície: branco quente semitransparente (`#FCFCF8`).
- Acento: verde (`#23845E`) para ação, progresso e satisfação positiva.
- Atenção: âmbar terroso; erro: vermelho queimado; neutro: azul-acinzentado.
- Raios: 12–18 px, com consistência por categoria de componente.
- Sombras: amplas e suaves; bordas finas para delimitar os painéis.
- Tipografia: uma família sans legível com números tabulares; pesos e escala
  substituem a dependência de várias fontes.

## Estrutura das telas

### Navegação e moldura

- Sidebar de tinta verde-marinho, marca NEXO compacta e navegação com estado
  selecionado em superfície clara.
- Cabeçalho móvel fixo com drawer, mantendo a mesma linguagem visual.
- Fundo geral marfim com uma textura/gradiente quase imperceptível.
- Conteúdo limitado a uma largura confortável, mas com mais espaço útil no
  dashboard.

### Login e cadastro

- Layout dividido em telas largas: narrativa curta do produto e formulário.
- Em telas pequenas, foco direto no formulário.
- Mesmo logotipo, cores e tipografia do aplicativo autenticado.
- Mensagens de erro próximas do formulário e transições discretas entre estados.

### Dashboard

- Saudação e ações principais no topo.
- Seletor de estabelecimento tratado como barra de contexto, não como um bloco
  isolado genérico.
- Três indicadores principais com número, origem e contexto da amostra.
- Avaliações como conteúdo principal; análises por aspecto como trilho lateral.
- Explicação visual clara da diferença entre nota do Google e satisfação textual.
- Estados vazio, carregando e falha com a mesma estrutura dos dados finais para
  evitar saltos de layout.

### Minhas lojas

- Cabeçalho mais direto e grade de cartões com ordem de leitura: identidade,
  status, indicadores, histórico de coleta e ações.
- Informações secundárias agrupadas, reduzindo a competição visual atual.
- Ação destrutiva menos proeminente que “Atualizar agora”, mas ainda acessível.

### Avaliações, insights e modais

- Avaliações com autor, data, nota e sentimento em uma linha de leitura clara.
- Aspectos em chips únicos, com texto e ícone/sinal além da cor.
- Gráficos e barras usando a paleta sem perder contraste.
- Modais com cabeçalho, corpo e rodapé previsíveis; progresso de mineração usa
  estados reais e `aria-live` já suportado pelo sistema.

## Movimento e interatividade

- Entrada de página em sequência curta: cabeçalho, barra de contexto, métricas e
  conteúdo, totalizando menos de 500 ms.
- Cartões sobem 2–3 px no hover; foco por teclado recebe destaque equivalente.
- Contadores e barras animam apenas quando os dados terminam de carregar.
- Botões comunicam pressionamento, carregamento e conclusão sem deslocar o layout.
- Troca de loja usa transição cruzada curta entre esqueletos e dados.
- Modal entra com fade e pequeno deslocamento; não usar zoom exagerado.
- Com `prefers-reduced-motion`, todas as animações não essenciais são removidas.

## Componentes e implementação

- Consolidar tokens no `index.css` e estender o tema Tailwind apenas quando
  necessário.
- Criar primitivas pequenas para rótulo editorial, superfície/painel, badge de
  status e bloco de métrica, evitando duplicação entre dashboard e lojas.
- Usar Framer Motion somente para orquestração de página, listas e modais; hover
  simples permanece em CSS.
- Preservar serviços, hooks e tipos. Alterações de componentes devem ser
  predominantemente estruturais e visuais.

## Responsividade e acessibilidade

- Ordem de leitura e foco segue a ordem visual.
- Alvos interativos de pelo menos 44 px em telas de toque.
- Contraste mínimo WCAG AA, inclusive nos textos de status.
- Uma única hierarquia de títulos por página, labels visíveis e status dinâmicos
  anunciados com `aria-live`.
- Gráficos devem manter rótulos ou alternativa textual; a cor nunca é o único
  diferenciador.

## Verificação

- Executar testes Vitest existentes e atualizar somente os que dependem de texto
  ou estrutura visual intencionalmente alterada.
- Executar Playwright nos fluxos de login, dashboard, seleção de loja, criação e
  acompanhamento de mineração.
- Rodar build e lint do frontend.
- Fazer inspeção visual em desktop, tablet e 320–390 px, incluindo navegação por
  teclado e preferência por movimento reduzido.
- Validar que nenhuma alteração afeta os contratos com o backend.

## Decisões deixadas ao implementador

- Valores finais de espaçamento, duração e curva de animação, desde que respeitem
  os limites descritos.
- Quebra exata dos componentes internos quando não altera comportamento público.
- Pequenos ajustes de texto para clareza, preservando o significado das métricas.
