# Piloto de anotação científica

## Protocolo v0.2 — exclusão de não experimentação (17/09/2026)

O usuário decidiu excluir declarações simples como “não cheguei a experimentar a
comida”, em vez de rotulá-las como Neutro. A decisão ocorreu **após inspeção das
previsões**, durante desenvolvimento do protocolo; não é uma avaliação cega.

O extrator agora filtra formas simples de não consumo antes de detectar/classificar
aspectos. Mantém o texto completo, evidências independentes, negações avaliativas,
críticas de indisponibilidade e casos causais/qualificados. A regra é conservadora,
não cobre todas as paráfrases possíveis. Nenhum checkpoint foi retreinado.

O piloto revisado fica em `dados_locais/piloto_20260916_v02/`: mesmos 30 textos,
87 menções elegíveis, exclusão de P006-M06 registrada com proveniência. Comida
continua presente em P006 por outras evidências sobre bebidas. Resultados e
anotações v0.1 permanecem intocados. A página v0.2 mostra a exclusão fora da tabela
de menções e das métricas. Mudanças de denominador não são melhora do modelo.

```powershell
python cientifico/revisar_escopo.py cientifico/dados_locais/piloto_20260916 cientifico/dados_locais/piloto_20260916_v02
```

Não sobrescrever a versão existente: escolha outra pasta para uma revisão futura.
Os comandos de comparação e geração do caderno abaixo também aceitam a pasta v0.2.
Esta mudança de código não reanalisa registros antigos no banco nem reconstrói o
Docker automaticamente; isso exige uma etapa operacional separada.

Primeiro passo: ler [GUIA_ANOTACAO.md](GUIA_ANOTACAO.md). O protocolo atual é v0.2;
as seções abaixo registram também a preparação histórica v0.1. O rascunho ainda
precisa de revisão humana antes de uma avaliação científica definitiva.

## Preparação de 16/09/2026

- Snapshot consultado em transação somente leitura: 100 avaliações com texto.
- Piloto: 30 avaliações distintas; 5 curtas, 13 médias e 12 longas.
- Apenas **um estabelecimento** disponível no snapshot. A diversidade de lojas
  continua pendente para a amostra definitiva. Não foi feita nova coleta manual.
- Seleção determinística por loja/comprimento com seed `tcc-piloto-v1-20260916`.
- Sem uso de estrelas, nomes de autores ou previsões na seleção/anotação sugerida.
- Não houve consulta à tabela de aspectos nem inferência com BERTweet/BERTimbau.
- O papel da amostra é desenvolvimento do protocolo, não teste final.

Os arquivos foram gerados em `dados_locais/piloto_20260916/` (ignorados pelo Git).
Há arquivos CEGO para anotação independente e RASCUNHO_IA para revisão assistida.
São CSV UTF-8 com BOM e separador ponto e vírgula, abríveis no Excel/LibreOffice.
Campos de revisão humana ficam vazios: não há gabarito humano concluído.

Para ler o rascunho de maneira mais confortável, abra
`dados_locais/piloto_20260916/REVISAO_PILOTO.html` no navegador. Ele é somente leitura:
as correções devem ser registradas nas colunas humanas dos CSV. As 88 menções
sugeridas e as 24 marcações de dúvida são contagens provisórias, não métricas de
qualidade. Todas as sugestões, mesmo sem dúvida marcada, precisam de revisão.

## Reproduzir uma exportação

Com o contêiner do banco existente em funcionamento, a partir da raiz do repositório:

```powershell
python cientifico/preparar_piloto.py --size 30 --output cientifico/dados_locais/outro_piloto
```

O script não inicia serviços, não minera e não altera o banco. A conexão usa as
credenciais já existentes dentro do contêiner; não imprime nem lê `.env`.
Não sobrescreve pastas existentes, para preservar anotações. Mesmo seed reproduz
a seleção somente se o snapshot dos dados permanecer igual. O manifesto registra
contagens, exclusões, checksum dos textos e horário de exportação; o vínculo com
IDs originais fica em arquivo privado separado.

Para transformar um rascunho estruturado em planilhas revisáveis:

```powershell
python cientifico/materializar_rascunho.py cientifico/dados_locais/piloto_20260916
python cientifico/gerar_caderno.py cientifico/dados_locais/piloto_20260916
```

O arquivo de entrada `rascunho_ia.json` é uma sugestão textual, não saída dos modelos
em comparação. O comando verifica IDs, categorias e correspondência literal dos
trechos e recusa sobrescrever as planilhas geradas.

## Limites desta entrega

Seleção por comprimento não garante equilíbrio de sentimentos/aspectos. Essa
distribuição será descrita após adjudicação humana, sem trocar casos para melhorar
métricas. Textos genéricos não são excluídos automaticamente; eles permitem testar
falsos positivos. A remoção de duplicatas usa apenas igualdade de texto normalizado,
não resolve paráfrases nem substitui a auditoria de sobreposição com o treinamento.

Os rótulos sugeridos pelo assistente não são evidência de qualidade do modelo. O
piloto inclui casos ambíguos sobre música, público, bebidas, segurança, gorjeta e
estacionamento. Resolver essas fronteiras e incluir outras lojas precede o estudo
definitivo. Não publicar dados reais automaticamente; a omissão da autoria não
remove dados pessoais eventualmente presentes nos comentários.

## Testes das ferramentas

```powershell
python -m unittest discover -s cientifico -p "test_*.py"
```

## Comparação exploratória dos modelos — 17/09/2026

As sugestões originais permanecem inalteradas. A comparação usa essas sugestões
como **referência provisória de IA**, não como gabarito humano. Ver as previsões
antes de revisar os rótulos torna essa revisão assistida, não cega.

```powershell
$env:HF_HUB_OFFLINE='1'
$env:TRANSFORMERS_OFFLINE='1'
python cientifico/comparar_piloto.py cientifico/dados_locais/piloto_20260916 --run-name comparacao_20260917
python cientifico/gerar_caderno.py cientifico/dados_locais/piloto_20260916 --comparison cientifico/dados_locais/piloto_20260916/comparacao_20260917/resultados.json
python cientifico/verificar_caderno.py cientifico/dados_locais/piloto_20260916 cientifico/dados_locais/piloto_20260916/comparacao_20260917/resultados.json
```

Os checkpoints precisam existir no cache/local. Não há download automático,
retreino, mineração ou gravação na aplicação. Scripts recusam sobrescritas.
Escolha novo nome de execução para repetir inferência. Para gerar outra página,
preserve a anterior antes; não sobrescreva anotações humanas.

A página `COMPARACAO_MODELOS.html` contém:

- **Ensaio controlado:** os mesmos 88 trechos e categorias para os dois modelos.
  BERTweet classifica o sentimento geral do trecho. BERTimbau recebe o trecho e
  a categoria como aspecto e termo-alvo; o caderno não define um termo-alvo mais
  específico. Isso não reproduz exatamente a escolha de termo-alvo da produção.
- **Fluxo atual:** extrator executado nos 30 textos inteiros, com os termos-alvo
  reais das regras. Exibe sentimento geral BERTweet e polaridades dos candidatos
  para ambos os modelos. Métricas de presença por avaliação–aspecto são separadas
  das métricas dos trechos controlados. Não calcular sentimento geral BERTimbau
  artificialmente a partir da média de polaridades.
- **Diagnósticos:** matrizes de confusão, precisão/recall/F1 macro e por classe,
  aspectos, dúvidas, truncamento e filtros de divergências. Números sempre
  relativos ao rascunho; dados reais, predições e imagens permanecem ignorados.

Resultados da execução: BERTweet concordou em 74/88 (84,1%; F1 macro 0,724),
BERTimbau em 80/88 (90,9%; F1 macro 0,694). O resultado depende da métrica: o
BERTweet teve F1 macro maior, enquanto o BERTimbau teve maior concordância total.
Há apenas cinco referências neutras. Esses números não elegem o modelo definitivo.
Os modelos divergiram entre si em 18 menções. Presença do extrator comparada ao
rascunho: 43 coincidências, 3 extras, 16 ausências (F1 0,819).

O JSON registra hashes dos inputs/checkpoints/extrator/script, revisão do
BERTweet, versões das bibliotecas, dispositivo e limites de tokenização. A página
recusa misturar um relatório com um rascunho ou amostra que tenha sido alterado.
Nenhuma polaridade do rascunho é passada como entrada aos classificadores.
