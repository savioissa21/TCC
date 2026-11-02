# Fechamento da avaliação da IA — design

## Intenção

Atender às observações da orientadora no Capítulo 4 com evidência experimental
reproduzível, sem substituir silenciosamente o modelo usado pelo sistema.

## Abordagens consideradas

- Documentar apenas as duas épocas existentes: não atende ao pedido de observar
  um treinamento mais longo.
- Continuar a partir do checkpoint da época 2: mais rápido, porém reinicia o
  estado do otimizador e do agendador e não produz uma curva comparável.
- Treinar cinco épocas desde o BERTimbau-base, com o mesmo conjunto, semente e
  hiperparâmetros: abordagem aprovada por preservar a comparabilidade.

## Protocolo aprovado

- Treinar do zero por cinco épocas com semente 42.
- Usar os mesmos 2.125 pares de treino, 569 de validação e 1.040 de teste do
  M-ABSA nos domínios `restaurant` e `food`.
- Manter lote físico 2, acumulação de gradientes 4, amostragem balanceada,
  comprimento 128, AdamW com taxa `2e-5` e aquecimento de 10%.
- Selecionar o checkpoint exclusivamente pela Macro-F1 da validação.
- Avaliar o teste uma única vez após a seleção.
- Salvar o experimento em artefato separado; não sobrescrever
  `artifacts/bertimbau-absa`.

## Alterações na monografia

- Explicar no Capítulo 4 como rótulos esperados, predições, matriz de confusão,
  métricas por classe, suporte e médias macro compõem o método de avaliação.
- Apresentar o código fundamental de seleção e teste no próprio Capítulo 4.
- Comparar as cinco épocas e discutir melhoria, estabilização ou sobreajuste.
- Explicar o resultado do BERTweet pela incompatibilidade entre sentimento geral
  e rótulo por aspecto, pela ausência de aspecto/termo-alvo na entrada e,
  secundariamente, pelas diferenças de domínio e tokenização.
- Basear a explicação nos erros observados, especialmente a superpredição da
  classe Neutro.

## Restrições

- Não consultar a partição de teste para escolher época ou hiperparâmetro.
- Não afirmar superioridade universal do BERTimbau sobre o BERTweet.
- Distinguir hipótese técnica de evidência medida.
- Preservar e identificar a execução original de duas épocas.
