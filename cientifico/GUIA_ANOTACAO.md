# Guia de anotação — piloto v0.2

Revisão de 17/09/2026: por decisão do usuário, declarações simples de não
experimentação/consumo saem das menções elegíveis. A decisão foi tomada durante
a inspeção das previsões do piloto; não é uma decisão independente ou de teste final.
Os artefatos v0.1 e seus resultados permanecem preservados.

Proposta de protocolo para revisão com o orientador. Não é um protocolo definitivo
nem um resultado experimental. Categorias compatíveis com o sistema atual:
Atendimento, Comida, Ambiente e Preço; polaridades Positivo, Negativo e Neutro.

## O que está sendo anotado

Leia a avaliação inteira, mas registre a opinião sobre **o estabelecimento avaliado**,
não sobre concorrentes citados. Não consulte estrelas, previsões, palavras-chave
do extrator ou sugestões da IA durante uma anotação humana independente.

Há duas tarefas distintas:

1. Presença: para cada avaliação e cada um dos quatro aspectos, indique Sim ou Não.
   Uma referência elegível sem julgamento pode ser neutra; mera declaração de não
   experimentação/consumo não torna o aspecto presente.
2. Menções: copie o trecho exato que sustenta cada aspecto presente e indique sua
   polaridade. Registre também referências descritivas sem julgamento.

Marque todas as referências relevantes, não apenas as encontradas pelo sistema.
Não corrija a ortografia do trecho. Ele deve ser uma substring literal do original.
Escolha o menor trecho contínuo que preserve alvo, opinião, negação e intensificadores.
Orações adjacentes do mesmo aspecto e polaridade podem formar uma menção; opiniões
separadas, aspectos diferentes ou polaridades opostas devem ter registros distintos.
Um trecho pode sustentar dois aspectos se realmente contiver evidência para ambos.
Essa regra de segmentação ainda será revisada no piloto.

Não confundir uma referência temática com uma palavra incidental: em “preço alto
por um hambúrguer” a opinião é sobre Preço; a palavra hambúrguer não exige uma
segunda menção neutra de Comida. Preferências pessoais (“amo IPA”), quando não
avaliam a oferta da loja, também devem ser discutidas para exclusão. O rascunho
marca explicitamente esses casos de fronteira, sem fingir consenso.

## Categorias propostas

| Aspecto | Incluir | Não inferir automaticamente |
|---|---|---|
| Atendimento | Funcionários, gerência, seguranças no trato com clientes, pedido, espera, entrega e processo de pagamento/entrada | Menção a mesa não é opinião sobre ambiente; preço não é atendimento |
| Comida | Alimentos, bebidas, sabor, temperatura, preparo, cardápio e disponibilidade de produtos | Demora do pedido não implica comida ruim; preço de um hambúrguer não implica avaliação de seu sabor |
| Ambiente | Espaço, conforto, limpeza, decoração, lotação, música, shows e atmosfera | Elogio genérico ao estabelecimento não basta; não presumir defeito porque está cheio |
| Preço | Valores, custo-benefício, entrada, couvert, gorjeta, taxas e cobranças | Fila para pagar é atendimento, não necessariamente preço |

Casos de fronteira para o orientador confirmar: comportamento do público, segurança
do espaço e estacionamento. Neste rascunho, o comportamento do público é Ambiente;
a conduta dos seguranças é Atendimento; **estacionamento/acesso externo fica fora das
quatro categorias**. Preserve observações sobre temas fora do escopo. Não crie nova
categoria no meio da anotação sem versionar o protocolo e revisar os casos anteriores.

O nome Comida inclui bebidas neste projeto. Isso deve aparecer na monografia para
não confundir o leitor, principalmente ao avaliar bares/pubs.

## Sentimentos, ausência e ambiguidades

- **Positivo:** aprovação, satisfação ou elogio relativo ao aspecto.
- **Negativo:** reprovação, insatisfação ou pedido de correção relativo ao aspecto.
- **Neutro:** referência ao aspecto sem orientação avaliativa identificável. Um valor
  informado sem julgamento pode ser neutro. Não é sinônimo de dúvida.
- **Ausente:** Não na planilha de presença e nenhuma menção para esse aspecto.
- **Indeterminado:** marcação provisória de revisão, não quarta classe do modelo.
  Use quando não é possível decidir a polaridade com segurança. Não force Neutro.
- **Opinião mista:** separe as evidências positivas e negativas; não calcule uma média
  nem transforme a contradição em Neutro.

“Bebida gelada” costuma ser elogio quando apresentada como qualidade; já “bebida fria”
depende do contexto. “Lotado” pode ser descritivo, positivo ou negativo. A decisão
vem do texto, não de uma palavra isolada. Preserve “não” e o alcance da negação.

“Não experimentei a comida” e “não cheguei a provar a bebida” ficam **fora das
menções elegíveis**, sem rótulo de sentimento. Não são negativos nem neutros.
O texto completo permanece armazenado. Se houver outra opinião sobre Comida na
mesma avaliação (por exemplo, “chopp delicioso”), essa outra evidência continua
válida e a presença do aspecto continua Sim.

Não excluir reclamações de indisponibilidade (“não tinham a bebida que eu queria”),
negações avaliativas (“não gostei da comida”), comparações (“nunca comi pizza tão
boa”) ou avaliações que expliquem o não consumo (“não comi porque estava queimada”).
Ausência de consumo não elimina automaticamente opinião sobre disponibilidade,
preço, aparência ou atendimento. As demais referências descritivas elegíveis podem
continuar Neutras. A implementação é uma regra conservadora para formas simples,
não um detector semântico completo de toda forma de ausência de experiência.

Explicitude: **Explicita** quando o alvo é nomeado (garçom, música, bebida, preço);
**Implicita** quando o alvo precisa ser inferido (“esperamos quarenta minutos”). Não
exija a palavra literal da categoria: “música” explicita Ambiente mesmo sem a palavra
“ambiente”. A interpretação de ironia deve ser anotada como dúvida quando incerta.

## Como preencher os arquivos cegos

1. Em `01_avaliacoes_CEGO.csv`, leia o texto e preencha incluir (Sim/Não), motivo de
   exclusão quando necessário e sem_aspecto (Sim/Não). Não exclua um texto apenas
   porque é difícil ou porque nenhum aspecto está presente.
2. Em `02_presenca_CEGO.csv`, preencha as quatro linhas por avaliação. Ausência é Não,
   não Neutro. Se ainda houver dúvida, deixe pendente e explique em observacoes.
3. Em `03_mencoes_CEGO.csv`, adicione as evidências; use IDs como P001-M01.
   Preencha aspecto, polaridade, explicitude, duvida (Sim/Não) e observacoes.
4. Para avaliações fora do idioma/escopo, textos ilegíveis ou claramente incompletos,
   registre a exclusão e sua justificativa antes das métricas. Não recomponha trechos
   truncados e não use a avaliação de um concorrente como se fosse da loja-alvo.
5. Confira: presença Sim deve ter pelo menos uma evidência; sem_aspecto Sim implica
   quatro ausências e zero menções. Refaça essa conferência após resolver divergências.

## Rascunho assistido não é anotação humana independente

Os arquivos RASCUNHO_IA são sugestões produzidas pelo assistente a partir dos textos,
sem consultar as previsões BERTweet/BERTimbau. As colunas humanas ficam vazias.
Não chamar esse material de “anotado manualmente” nem usá-lo como gabarito definitivo.

Você pode revisar e corrigir as sugestões para desenvolver o protocolo, registrando
o método como **pré-anotação por IA com revisão humana**. Para anotação independente
ou medição de concordância, cada anotador deve receber somente os arquivos CEGO e
o guia, antes de ter acesso às sugestões. Use identificação do anotador, data e
versão do guia; registre divergências antes de produzir consenso. Não confunda
concordância humano–IA com concordância entre anotadores humanos.

## Uso científico e privacidade

O piloto serve para desenvolver o guia, não para testar definitivamente o modelo.
Não reutilize suas avaliações, duplicatas ou trechos no teste final. Antes de ajustar
regras/modelos, defina a separação desenvolvimento/teste para a amostra definitiva.
Documente coleta parcial, seleção, quantidade de lojas e distribuição de classes.

Na avaliação de extração, compare conjuntos de aspectos por avaliação; não conte
vários trechos do mesmo aspecto como vários acertos de presença. Para polaridade,
compare os modelos nos mesmos pares trecho–aspecto revisados. A avaliação ponta a
ponta precisa contar aspectos perdidos/indevidamente encontrados, não só acertos de
sentimento nos aspectos detectados.

Os arquivos locais omitem o campo de autoria e as estrelas, mas os próprios textos
podem conter nomes e detalhes identificáveis. Isso **não é anonimização completa**.
Não publicar o material bruto no GitHub ou anexá-lo à monografia sem revisão de
privacidade e alinhamento com o orientador. Alegações feitas em avaliações não são
fatos verificados pelo projeto.
