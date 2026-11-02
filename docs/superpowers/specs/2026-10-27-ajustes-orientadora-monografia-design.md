# Ajustes da orientadora na monografia — design

## Intenção

Incorporar as observações da orientadora ao capítulo de Materiais e Métodos e
harmonizar a terminologia em toda a monografia, sem alterar a arquitetura ou os
resultados científicos já documentados.

## Abordagens consideradas

- Imagens externas em PNG: simples, porém perdem qualidade e dificultam futuras
  correções no Overleaf.
- Diagramas vetoriais nativos em LaTeX/TikZ: mantêm tipografia, qualidade e
  edição junto ao texto. Esta foi a abordagem aprovada.

## Alterações aprovadas

- Inserir na Seção 3.2 um diagrama de pacotes em preto e branco, mostrando os
  módulos `dashboard-front`, `dashboard-api` e `minerador-py`, seus principais
  pacotes internos e as dependências PostgreSQL e Apify.
- Inserir na explicação dos aspectos um fluxograma que evidencie a separação
  entre extração determinística e classificação de polaridade pelo BERTimbau.
- Definir polaridade como a orientação avaliativa dirigida a um aspecto, nas
  classes Positivo, Neutro e Negativo, e distingui-la da nota em estrelas.
- Apresentar a Google Business Profile API como alternativa oficial, explicando
  seus requisitos de acesso e o motivo de ela não ter sido adotada no protótipo.
- Apoiar o procedimento de aquisição e extração em documentação oficial do
  Google e da Apify.
- Colocar estrangeirismos comuns em itálico, preservando sem itálico nomes
  próprios, marcas, siglas e identificadores de código.

## Restrições

- Não afirmar que o BERTimbau extrai sozinho os aspectos.
- Não chamar o processo oficial do Google apenas de “burocrático”; descrever
  objetivamente seus requisitos.
- Não apresentar a Apify como API oficial do Google.
- Os diagramas devem caber em página A4 e permanecer legíveis em impressão.
