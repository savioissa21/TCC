# Revisão das melhorias prioritárias — 08/09/2026

A revisão das nove melhorias encontrou uma lacuna de implementação: o processo
Python ainda podia bloquear indefinidamente a fila. Isso foi corrigido. As
demais medidas estão presentes no código, mas a disponibilização do modelo,
a rotação dos segredos e a validação no PostgreSQL real continuam dependendo
do ambiente. Não há evidência suficiente para declarar a implantação pronta.

| Melhoria | Resultado e evidência |
|---|---|
| Impedir acesso a avaliações de outro estabelecimento | Implementada. `ReviewService.getByEstablishmentId` valida o proprietário antes da consulta; as consultas de IDs e de aspectos também filtram pelo e-mail autenticado. Testes cobrem acesso negado, ausência de autenticação e isolamento das consultas. |
| Retirar senha PostgreSQL e chave JWT do versionamento | Implementada nos arquivos atuais: variáveis obrigatórias, `.env.example` vazio e exclusões no Git/contexto Docker. A documentação explica rotação, tokens invalidados e senha de volumes antigos. Não foi possível comprovar que as credenciais anteriormente expostas foram efetivamente trocadas. |
| Garantir uso do BERTimbau ABSA treinado | Implementada a montagem somente leitura e a validação obrigatória de arquivos, classes e checksum, seguida de carregamento/inferência no preflight Docker. Não há fallback ABSA para BERTweet. O checkpoint não está nesta cópia; sua publicação e disponibilidade não foram comprovadas. O preflight falhou explicitamente, como esperado, por modelo/checksum ausentes. |
| Limitar execução do Python e do Playwright | Corrigida nesta revisão. `MiningProcessRunner` drena logs em paralelo, limita a espera do processo e dos logs, propaga erros e encerra Python/descendentes no cleanup. `MINING_PROCESS_TIMEOUT` configura o limite, por padrão 15 minutos. Playwright tem limites explícitos para inicialização, ações e navegação. |
| Corrigir vulnerabilidades npm | O lockfile existente passou pela auditoria online com zero vulnerabilidades; não foi necessário alterar versões. Instalação reproduzível com `npm ci`, build e lint validados. |
| Evitar processamento de todas as avaliações em memória e consultas por loja | Implementada no dashboard: paginação de IDs no banco, carregamento de aspectos somente da página, limite de 100 itens, agregações para estatísticas e resumo das lojas. Aspectos são `LAZY`. Testes verificam contagem de consultas e entidades carregadas. A importação percorre o histórico em páginas de 500; ainda faz uma varredura do histórico, o que pode exigir otimização quando o volume crescer. |
| Deduplicar prioritariamente pelo ID Google | Implementada. ID original preservado e índice único por estabelecimento; conteúdo idêntico com IDs diferentes é mantido. Fingerprint é usado para registros sem identidade e promoção de legados, com correspondência individual. Testes cobrem IDs repetidos, conteúdo editado, legados e lotes mistos. |
| Validar login e cadastro sem enumerar usuários no login | Implementada. `@Valid`, e-mail, campos obrigatórios, limites de tamanho e limite UTF-8 para BCrypt. Conta inexistente e senha incorreta retornam a mesma mensagem; existe comparação com hash fictício para conta inexistente. Testes também cobrem JSON inválido e ausência de exposição da senha. |
| Substituir `ddl-auto=update` por migrations | Implementada. Flyway V1/V2, `ddl-auto=validate`, validação de checksum e baseline automático desativado. Testes cobrem banco vazio, adoção explícita, preservação de dados e unicidade. Execução verificada em H2 compatível com PostgreSQL, ainda não em PostgreSQL real. |

## Correções adicionais encontradas na validação

- Separação dos hooks `useAuth` e `useToast` dos componentes providers para
  corrigir os erros de Fast Refresh, com atualização dos consumidores.
- Remoção de `any` no tratamento de erro de criação de estabelecimento.
- Estabilização dos métodos de toast e da função de carregamento das lojas,
  corrigindo a dependência do efeito sem provocar recargas a cada toast.
- Liberação do estado de carregamento ao recuperar um token expirado; antes,
  o retorno antecipado podia deixar a rota privada carregando indefinidamente.

## Validação executada

- API: `mvnw.cmd test -q`, usando Java 21 disponível no Eclipse: **93 testes,
  zero falhas, zero erros e nenhum ignorado**.
- Os cinco novos testes do executor usam subprocessos Java reais: sucesso,
  mensagem de erro UTF-8, timeout com saída sem quebra de linha e execução
  posterior, encerramento de descendente e interrupção pelo chamador.
- Python: `python -m unittest discover -s minerador-py -p 'test_*.py'`:
  **25 testes aprovados**. Esses testes não fazem inferência com o checkpoint real.
- Frontend: `npm ci`, `npm run build` e `npm run lint` concluídos.
- `npm audit --json --offline=false --prefer-online`: **zero vulnerabilidades**
  na consulta realizada nesta revisão. Esse resultado é pontual, não uma
  garantia de ausência de vulnerabilidades futuras ou fora da cobertura do npm.
- O build ainda informa bundle JavaScript de aproximadamente **732 kB**
  minificado (**228 kB gzip**). Divisão por rotas é uma otimização futura;
  esse aviso não impediu o build.

## Pendências para validar a implantação

1. Disponibilizar o checkpoint treinado e seu checksum confiável, configurar
   o volume e executar o preflight com inferência real.
2. Comprovar a rotação da senha PostgreSQL e da chave JWT anteriormente
   versionadas. Nenhuma credencial de ambiente foi alterada nesta revisão.
3. Executar as migrations e consultas em PostgreSQL real, inclusive numa cópia
   de banco existente antes do baseline. O Docker Engine estava indisponível.
4. Executar o fluxo completo no navegador: login, lojas, mineração, filtros,
   paginação e timeout. Build/lint e testes de backend não substituem esse fluxo.

Referências técnicas consultadas para a correção: documentação oficial de
[Process no Java 21](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Process.html)
(limites de espera, pipes e encerramento) e
[timeouts do contexto Playwright](https://playwright.dev/python/docs/api/class-browsercontext#browser-context-set-default-timeout).
