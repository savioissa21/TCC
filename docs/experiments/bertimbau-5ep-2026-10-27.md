# Síntese do experimento BERTimbau com cinco épocas

Data da execução: 27 de outubro de 2026.

## Protocolo

- modelo-base: `neuralmind/bert-base-portuguese-cased`;
- dados: M-ABSA, domínios `restaurant` e `food`;
- divisão: 2.125 pares de treinamento, 569 de validação e 1.040 de teste;
- semente: 42;
- lote: 2, com acúmulo de gradientes igual a 4;
- sequência máxima: 128 tokens;
- taxa de aprendizado: 2e-5;
- aquecimento linear: 10%;
- amostragem balanceada: habilitada;
- seleção: maior Macro-F1 na validação;
- teste: executado uma vez, após as cinco épocas, sobre o checkpoint selecionado.

O modelo e o relatório foram gravados em
`minerador-py/artifacts/experiments/bertimbau-absa-5ep/`, sem sobrescrever o
checkpoint utilizado pela aplicação.

## Curva de validação

| Época | Perda treino | Perda validação | Acurácia | Precisão macro | Revocação macro | Macro-F1 |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 0,9121 | 0,6732 | 0,7206 | 0,6117 | 0,6193 | 0,5743 |
| 2 | 0,3781 | 0,5484 | 0,8594 | 0,6547 | 0,6532 | **0,6492** |
| 3 | 0,1822 | 0,6383 | 0,8594 | 0,6733 | 0,6458 | 0,6428 |
| 4 | 0,1370 | 0,6985 | 0,8699 | 0,7003 | 0,6333 | 0,6488 |
| 5 | 0,0901 | 0,7039 | 0,8682 | 0,7091 | 0,6309 | 0,6481 |

A época 2 foi selecionada sem consultar a partíção de teste. A partir da
época 3, a perda de treinamento continuou caindo, mas a perda de validação
aumentou e a Macro-F1 não superou 0,6492. Esse comportamento é compatível com
início de sobreajuste.

## Avaliação única no teste

- acurácia: 0,8394;
- precisão macro: 0,6568;
- revocação macro: 0,6400;
- Macro-F1: 0,6373;
- matriz de confusão, nas classes Negativo, Neutro e Positivo:
  `[[180, 5, 33], [31, 14, 31], [47, 20, 679]]`.

## Relação com a execução original

A execução original de duas épocas obteve Macro-F1 de validação 0,6856 e,
no teste, acurácia 0,8202 e Macro-F1 0,6427. O ensaio de cinco épocas não
deve ser interpretado como simples continuação desse treinamento: o agendador
linear calcula o total de passos e o aquecimento a partir do número total de
épocas, de modo que a trajetória da taxa de aprendizado também mudou. Assim,
as épocas de mesmo número nas duas execuções não são idênticas.

O ensaio adicional comprova que o aumento para cinco épocas não trouxe ganho
na métrica principal e fornece evidência de sobreajuste após a segunda época.
Ele não foi usado para substituir retroativamente o modelo de produção nem
para escolher hiperparâmetros com base no teste.

## Rastreabilidade

- SHA-256 do relatório original de duas épocas:
  `A528788A3D4F8FB6BFC22CF103CFC5743B33831A84B45F328CEC77BD75CFE05B`;
- SHA-256 do relatório de cinco épocas:
  `4164FD5C2E070436E858A34D4844CCD9504E230968111C581CF5D112AE168C55`.
