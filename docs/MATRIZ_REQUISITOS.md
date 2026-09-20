# Matriz de rastreabilidade do NEXO

Estado verificado em 20/09/2026. “Validado” indica evidência automatizada no
repositório; não significa que uma dependência externa, como o Google Maps,
esteja permanentemente disponível.

| Requisito | Implementação principal | Evidência | Estado |
|---|---|---|---|
| Cadastro, login e dados isolados por gestor | `AuthController`, `SecurityFilter`, serviços com verificação de proprietário | `AuthenticationContractTest`, `ReviewQueriesTest`, E2E com duas contas | Validado |
| Cadastrar estabelecimento por URL do Google Maps | `EstablishmentService`, `CreateEstablishmentModal` | testes Java/React e E2E full-stack | Validado |
| Coletar avaliações e permitir atualização periódica | `MiningJobService`, scheduler e `maps_collector.py` | testes de fila/recuperação, fixture full-stack e smoke histórico | Validado com limitação externa |
| Não duplicar avaliações entre coletas | identidade Google e fingerprint de fallback no importador | testes Python/Java e segunda coleta do E2E importando zero | Validado |
| Persistir e recuperar o estado da coleta | entidade/repositório de jobs e migration V3 | testes de recuperação e E2E após reload | Validado |
| Detectar Atendimento, Comida, Ambiente e Preço | `aspect_extractor.py`, por regras lexicais contextualizadas | regressões do extrator | Validado para as regras congeladas |
| Classificar polaridade por aspecto | checkpoint BERTimbau ABSA obrigatório | preflight de classes/hash/inferência e testes do pipeline | Validado tecnicamente; métricas reais em andamento |
| Classificar sentimento geral | BERTweet PT com truncamento por tokens | testes do minerador e smoke histórico | Validado tecnicamente |
| Exibir indicadores, avaliações, filtros e paginação | React e consultas paginadas da API | testes de componentes, navegador e PostgreSQL | Validado |
| Diferenciar coleta completa, parcial e falha | avisos do coletor, estado persistido e interface | testes Java, Python e cenário full-stack | Validado |
| Executar o produto de forma reproduzível | Compose, Dockerfile multi-stage, Flyway e healthchecks | build da imagem de produção e Compose E2E saudável | Validado |
| Comparar BERTweet e BERTimbau em amostra real | ferramentas em `cientifico/` e caderno de revisão | 17 testes científicos; anotação/revisão humana | Em andamento |
| Relatar precisão, recall, F1 e matrizes de confusão | scripts e artefatos em `cientifico/` | depende do conjunto final revisado por anotadores | Pendente de fechamento científico |

## Limites declarados

- Os aspectos são detectados por regras; o BERTimbau classifica a polaridade
  dos candidatos e não executa sozinho a extração.
- A coleta usa a interface pública do Google Maps, sujeita a bloqueio, convite
  de login e mudanças de DOM. Esses casos são falha ou coleta parcial, nunca
  “zero avaliações” silencioso.
- O E2E de CI substitui apenas Maps e modelos por fixture determinística. O
  smoke real continua sendo uma verificação manual antes da entrega.
- A conclusão científica depende da amostra real congelada e revisada; os
  testes técnicos não substituem essa etapa.
