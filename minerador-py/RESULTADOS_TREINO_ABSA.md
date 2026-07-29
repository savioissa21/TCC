# Resultados do fine-tuning BERTimbau ABSA

Execução realizada em 14 de julho de 2026 em uma NVIDIA GeForce GTX 1650 de
4 GB, com BERTimbau-base (`neuralmind/bert-base-portuguese-cased`), precisão
mista, comprimento máximo 128 e lote efetivo 8.

Ambiente: Python 3.13.7, PyTorch 2.10.0+cu130, Transformers 4.57.6 e NumPy
2.4.1.

## Dados

- Fonte: `Multilingual-NLP/M-ABSA`.
- Domínios: `restaurant` e `food`, idioma português.
- Treino: 2.125 pares texto/aspecto/termo-alvo.
- Validação: 569 pares.
- Teste reservado: 1.040 pares.
- Classes no treino: 1.523 positivas, 529 negativas e 73 neutras.

Os textos em português do M-ABSA são traduções. Portanto, estes resultados
validam o pipeline e constituem um baseline, mas devem ser confirmados com o
ABSAPT 2024 e uma amostra humana do domínio de restaurantes do projeto.

## Comparação dos experimentos

| Experimento | Acurácia | Macro-F1 | F1 negativo | F1 neutro | F1 positivo |
|---|---:|---:|---:|---:|---:|
| Aspecto amplo, sem reamostragem | 0,8374 | 0,5549 | 0,7574 | 0,0000 | 0,9072 |
| Aspecto + termo-alvo, amostragem balanceada | 0,8202 | **0,6427** | 0,7664 | 0,2556 | 0,9061 |

O segundo experimento foi selecionado. A pequena redução de acurácia é
compensada pelo ganho de Macro-F1 e pela capacidade, ainda limitada, de prever
a classe neutra. O primeiro modelo obtinha acurácia maior ignorando todos os
exemplos neutros.

## Comparação com o BERTweet usado anteriormente

Os dois modelos foram avaliados nos mesmos 1.040 pares do teste reservado. O
BERTweet é um classificador de sentimento geral; por isso, sua previsão da
frase foi repetida para cada aspecto anotado.

| Modelo | Acurácia | Macro-F1 | F1 negativo | F1 neutro | F1 positivo |
|---|---:|---:|---:|---:|---:|
| BERTweet (`pysentimiento/bertweet-pt-sentiment`) | 0,6337 | 0,5306 | 0,5625 | 0,2345 | 0,7947 |
| BERTimbau ajustado por aspecto + termo-alvo | **0,8202** | **0,6427** | **0,7664** | **0,2556** | **0,9061** |

Neste corpus, o BERTimbau ajustado superou o BERTweet em 18,65 pontos
percentuais de acurácia e 0,1121 de Macro-F1. A comparação ainda precisa ser
repetida em anotações humanas do domínio final antes de sustentar uma conclusão
geral sobre restaurantes brasileiros.

## Matriz de confusão do modelo selecionado

Linhas representam a classe real e colunas a classe prevista, na ordem
`Negativo`, `Neutro`, `Positivo`.

```text
[[169, 28, 21],
 [ 22, 23, 31],
 [ 32, 53, 661]]
```

## Teste qualitativo

Para “A pizza é ótima, mas o atendimento foi péssimo e o preço é alto”, o
segmentador separa a oração contrastiva e o modelo retorna:

- Comida/pizza: Positivo (97,1%);
- Atendimento/atendimento: Negativo (95,0%);
- Preço/preço: Negativo (95,3%).

O resultado também mostra uma limitação: sem segmentar a oração introduzida por
“mas”, o sentimento negativo dominante ainda contamina o aspecto Comida. Essa
limitação deve constar na monografia e orientar a anotação de dados próprios.
