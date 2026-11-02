# Integração final e auditoria da monografia

## Objetivo

Integrar o redesign aprovado na `main`, versionar os documentos científicos locais legítimos, conferir a monografia final contra o sistema efetivamente versionado e publicar a `main` somente depois das validações.

## Escopo

- preservar os arquivos locais não rastreados durante a integração;
- incorporar `feat/redesign-executivo-editorial` à `main`;
- conferir fonte Overleaf e PDF final em relação à arquitetura, coleta, modelos, aspectos, métricas, testes e interface atuais;
- corrigir apenas divergências comprovadas, sem inventar resultados;
- recompilar e inspecionar visualmente o PDF quando a fonte for alterada;
- atualizar o pacote Overleaf e enviar a `main` ao `origin`.

## Critérios de aceite

- nenhum documento local legítimo é perdido;
- testes do sistema passam no resultado mesclado;
- texto e números da monografia correspondem às evidências do repositório;
- fonte Overleaf, pacote ZIP e PDF final representam a mesma revisão;
- `origin/main` aponta para o commit final validado.
