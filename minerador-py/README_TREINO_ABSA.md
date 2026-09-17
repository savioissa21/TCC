# Fine-tuning do BERTimbau para ABSA

O treino classifica a polaridade (`Negativo`, `Neutro` ou `Positivo`) de uma
avaliação condicionada a um dos quatro aspectos do projeto: `Atendimento`,
`Comida`, `Ambiente` e `Preço`.

O método implementado é híbrido: regras lexicais contextualizadas identificam
candidatos aos quatro aspectos; o BERTimbau ajustado classifica a polaridade de
cada candidato usando trecho, categoria e termo-alvo. O modelo não descobre
sozinho os aspectos. Ironia, gíria e regionalismo não têm eficácia comprovada.
`inference_batch.py` reúne os candidatos e usa `predict_many`; o truncamento
ocorre somente no tokenizer, preservando o comentário integral.

O treino agora bloqueia textos normalizados presentes em splits distintos,
antes de limitar amostras, e registra SHA-256 dos arquivos do dataset,
hardware, seed e métricas por aspecto. Se o corpus oficial tiver sobreposição,
a execução falha: prepare uma versão deduplicada documentada, preservando o
teste reservado, e não compare seus resultados como se fossem o experimento
histórico. Não há novo treino ou nova métrica implícitos nessa alteração.

Benchmark real no ambiente Linux com checkpoint e SHA configurados:

```bash
python benchmark_inference.py > benchmark.json
```

Registra inicialização, tempo por 100 avaliações sintéticas, RSS máximo nativo,
dispositivo e previsões. Os testes unitários usam classificadores falsos apenas
para verificar associação e falha atômica; não comprovam polaridade real.

Para a avaliação final, reservar 150–300 pares do domínio, desidentificados,
sem sobreposição com treino, e obter anotações independentes de dois avaliadores.
Calcular Cohen kappa antes da adjudicação, preservar as duas anotações e o
consenso, e comparar BERTweet e ABSA no mesmo conjunto. Publicar precisão,
recall, F1 por classe/aspecto, Macro-F1 e matrizes. Fixar tolerância absoluta
de 0,005 para reproduzir Macro-F1/acurácia do checkpoint e splits idênticos;
divergências exigem investigação, não alteração retrospectiva da tolerância.
Essa amostra humana ainda não está disponível no repositório.

## Treino completo

```powershell
python -m pip install -r requirements-gpu.txt
python treinar_bertimbau_absa.py --epochs 2 --batch-size 2 --gradient-accumulation-steps 4 --balanced-sampling
```

O script baixa automaticamente as partições em português dos domínios
`restaurant` e `food` do corpus M-ABSA, preserva as divisões oficiais de treino,
validação e teste e salva o melhor checkpoint em
`artifacts/bertimbau-absa`.

O caminho padrão é ancorado nesta pasta (`minerador-py`), independentemente do
diretório em que o comando for executado. Preserve e publique a pasta completa,
incluindo os pesos, tokenizer, `training_report.json`, `training_args.json` e
`dataset_examples.json`, em uma versão imutável do seu armazenamento de
artefatos. Depois de baixá-la no servidor, aponte `ABSA_MODEL_HOST_PATH` do
`.env` para essa versão; o Docker a montará em modo somente leitura.

Não publique os pesos diretamente no Git comum. Para registrar a integridade da
versão distribuída, calcule e guarde o SHA-256 do checkpoint completo junto do
artefato. Configure esse valor como `ABSA_MODEL_SHA256` no `.env` de produção;
sem ele, o contêiner recusa iniciar:

```bash
python validate_absa_model.py --model-path artifacts/bertimbau-absa --print-sha256
```

## Teste de inferência

```powershell
python testar_bertimbau_absa.py
```

## Limitação do corpus

O M-ABSA é público e permite reproduzir o pipeline imediatamente, mas seus
textos em português são traduções. Para os números finais da monografia,
recomenda-se repetir o treino com o corpus humano do ABSAPT 2024 e com uma
amostra anotada das avaliações de restaurantes coletadas pelo projeto.

Os resultados desta execução estão documentados em `RESULTADOS_TREINO_ABSA.md`.

Para reproduzir a comparação com o modelo anterior:

```powershell
python avaliar_bertweet_baseline.py
```

O arquivo `training_report.json`, gerado junto do modelo, registra Macro-F1,
precisão, revocação, métricas por classe e matriz de confusão. Ele deve ser
preservado como evidência do experimento usado na monografia.

Na GTX 1650 de 4 GB, use lote físico 2 e acumulação 4, equivalendo a um lote
efetivo de 8 exemplos. O script ativa precisão mista automaticamente quando o
PyTorch detecta CUDA.

Além do aspecto amplo, o modelo recebe o termo-alvo anotado, por exemplo
`Comida + pizza` ou `Atendimento + garçom`. A amostragem balanceada aumenta a
exposição à classe neutra, que é muito minoritária no corpus original.
