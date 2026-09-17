"""Gera um caderno HTML local de leitura; a revisão editável permanece nos CSV."""
import argparse
import html
import json
from pathlib import Path

from materializar_rascunho import read_csv, validate_draft


def render_notebook(folder: Path, comparison_path: Path | None = None) -> str:
    reviews = read_csv(folder / "01_avaliacoes_CEGO.csv")
    draft = json.loads((folder / "rascunho_ia.json").read_text(encoding="utf-8"))
    manifest = json.loads((folder / "manifesto.json").read_text(encoding="utf-8"))
    validate_draft(reviews, draft)
    comparison = None
    outputs = {}
    if comparison_path is not None:
        import comparacao_html as comparison_ui
        comparison = comparison_ui.load_comparison(folder, comparison_path)
        outputs = {m["mention_id"]: m for m in comparison["mentions"]}
    proposals = {r["id"]: r for r in draft["reviews"]}
    escape = html.escape
    cards = []
    for review in reviews:
        proposal = proposals[review["avaliacao_id"]]
        lines = []
        for index, (excerpt, aspect, polarity, explicitness, doubt, note) in enumerate(proposal["mentions"], 1):
            css = {"Positivo": "pos", "Negativo": "neg", "Neutro": "neu", "Indeterminado": "neu"}[polarity]
            mention_id = f'{review["avaliacao_id"]}-M{index:02d}'
            attributes, extra_cells = "", ""
            if comparison is not None:
                row = outputs[mention_id]
                models_differ = row["bertweet"]["sentiment"] != row["bertimbau"]["sentiment"]
                reference_differ = any(row[m]["sentiment"] != polarity for m in ("bertweet", "bertimbau"))
                attributes = (f' data-mention="{escape(mention_id)}" data-models="{int(models_differ)}" '
                              f'data-reference="{int(reference_differ)}" data-doubt="{int(doubt == "Sim")}" '
                              f'class="{"model-diff" if models_differ else ""} {"reference-diff" if reference_differ else ""}"')
                extra_cells = comparison_ui.prediction_cells(row)
            lines.append(f'<tr{attributes}><td>M{index:02d}</td><td>{escape(excerpt)}</td>'
                         f'<td>{escape(aspect)}<br><span class="tag {css}">{escape(polarity)}</span><br>'
                         f'<small>{escape(explicitness)}</small></td>{extra_cells}'
                         f'<td>{"⚑ Dúvida: " if doubt == "Sim" else ""}{escape(note) or "—"}</td></tr>')
        extra_headers = '<th>BERTweet · trecho</th><th>BERTimbau · aspecto</th>' if comparison is not None else ''
        table = ('<div class="scroll"><table class="controlled"><thead><tr><th>ID</th><th>Evidência literal</th>'
                 '<th>Rascunho IA</th>' + extra_headers + '<th>Revisão</th></tr></thead><tbody>' + ''.join(lines) + '</tbody></table></div>') if lines else (
                 '<p class="warning">Sem aspectos propostos. Confirmar esta decisão; não é ausência validada por humano.</p>')
        operational = comparison_ui.operational_panel(comparison, review["avaliacao_id"]) if comparison is not None else ''
        cards.append(f'<section data-review="{escape(review["avaliacao_id"])}" id="{escape(review["avaliacao_id"])}"><h2>{escape(review["avaliacao_id"])}'
                     f' <small>· {escape(review["loja_codigo"])}</small></h2>'
                     f'<blockquote>{escape(review["texto"])}</blockquote>'
                     f'<p class="note">{escape(proposal["notes"])}</p>{table}{operational}'
                     '<p class="pending">Status: PENDENTE DE REVISÃO HUMANA</p></section>')
    navigation = ' '.join(f'<a href="#{escape(r["avaliacao_id"])}">{escape(r["avaliacao_id"])}</a>' for r in reviews)
    header = '''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Piloto de anotação — revisão humana pendente</title>
<style>
:root{font-family:system-ui,sans-serif;color:#152438;background:#f3f5f8;line-height:1.6}
body{max-width:1120px;margin:auto;padding:28px}header,section{background:white;border:1px solid #dbe2e9;border-radius:12px;padding:26px;margin-bottom:22px}
h1{font-size:1.8rem;line-height:1.25}h2{margin-top:0}h2 small{font-weight:400;color:#667085}
.warning{background:#fff3d6;border-left:4px solid #bb7900;padding:14px}blockquote{white-space:pre-wrap;margin:0;padding:20px;background:#f5f7fa;border-radius:8px}
.note{color:#45566c}.pending{font-size:.78rem;color:#8b5100;letter-spacing:.04em;font-weight:700}
table{border-collapse:collapse;width:100%;font-size:.9rem}th{text-align:left;background:#eef2f6}td,th{border-bottom:1px solid #dde3eb;padding:10px;vertical-align:top}
td:nth-child(2){width:49%;white-space:pre-wrap}td:nth-child(3){min-width:105px}small{font-size:.8rem}
.tag{display:inline-block;padding:2px 7px;border-radius:5px;font-weight:600}.pos{background:#e2f3e7;color:#21603a}.neg{background:#fde7e8;color:#a5242e}.neu{background:#eef0f3;color:#485469}
nav{display:flex;gap:8px;flex-wrap:wrap}a{color:#1455a1}nav a{padding:3px 7px;background:#eef3fa;border-radius:5px;text-decoration:none}.scroll{overflow:auto}
@media print{body{background:white;padding:0}section{break-inside:avoid}nav{display:none}}
</style></head><body><header><p>CIENTÍFICO · PILOTO v__VERSION__ · __DATE__</p>
<h1>__SELECTED__ avaliações para revisar o protocolo de anotação</h1>
<p class="warning"><strong>Rascunho produzido por IA, não gabarito humano.</strong>
As sugestões não foram confrontadas com previsões do BERTweet/BERTimbau. Todas precisam de revisão.
Este piloto é desenvolvimento, não teste final.</p>
<p>Fonte: __SELECTED__ textos selecionados entre __AVAILABLE__ registros disponíveis; __STORES__ estabelecimento(s) no piloto.
Não representa a população de avaliações. Campo de autoria omitido, mas os textos ainda podem conter dados pessoais.
Material local: não publicar sem revisão.</p>
<p>Leia o <a href="../../GUIA_ANOTACAO.md">guia</a> antes de revisar.
Este caderno é somente leitura. Preencha as colunas humanas nas planilhas:
<a href="04_avaliacoes_RASCUNHO_IA.csv">avaliações</a>,
<a href="05_presenca_RASCUNHO_IA.csv">presença de aspectos</a> e
<a href="06_mencoes_RASCUNHO_IA.csv">menções e sentimentos</a>.</p>
<p>Para uma anotação independente, entregue a outro anotador somente os arquivos CEGO e o guia,
sem este caderno nem as sugestões.</p><nav>'''
    for key, value in {"__VERSION__": draft["guide_version"], "__DATE__": draft.get("created_on", ""),
                       "__SELECTED__": len(reviews), "__AVAILABLE__": manifest["available_rows"],
                       "__STORES__": len(manifest["counts_by_store"])}.items():
        header = header.replace(key, escape(str(value)))
    revision_banner = ''
    if draft.get("scope_revision"):
        exclusions = ''.join(f'<li>{escape(r["original_mention_id"])}: “{escape(r["text"])}” — {escape(r["reason"])}</li>'
                             for r in draft.get("excluded_mentions", []))
        revision_banner = ('<section><h2>Protocolo v0.2: não experimentação fora das menções</h2>'
                           '<p class="warning">Decisão de escopo do usuário após inspecionar as previsões do piloto. '
                           'Não houve retreino. Uma mudança de métricas nesta versão não significa melhoria do modelo.</p>'
                           '<p>As exclusões abaixo não têm polaridade e não entram no denominador da comparação. '
                           'O texto completo e outras opiniões da avaliação são preservados.</p><ul>' + exclusions + '</ul></section>')
    summary, script = '', ''
    if comparison is not None:
        header = header.replace('</style>', comparison_ui.STYLE + '</style>')
        header = header.replace('As sugestões não foram confrontadas com previsões do BERTweet/BERTimbau. Todas precisam de revisão.',
                                'As sugestões foram criadas antes da inferência e agora são comparadas aos modelos. Todas precisam de revisão humana; esta leitura já não é cega.')
        header = header.replace('Piloto de anotação — revisão humana pendente', 'BERTweet × BERTimbau — comparação exploratória')
        summary, script = comparison_ui.overview(comparison), comparison_ui.SCRIPT
    if draft.get("scope_revision"):
        header = header.replace('As sugestões não foram confrontadas com previsões do BERTweet/BERTimbau. Todas precisam de revisão.',
                                'Referência com revisão de escopo após inspeção dos modelos; não é anotação humana cega.')
        header = header.replace('As sugestões foram criadas antes da inferência e agora são comparadas aos modelos. Todas precisam de revisão humana; esta leitura já não é cega.',
                                'Rascunho original de IA com revisão de escopo pelo usuário após inspecionar as previsões. Não é um gabarito humano validado.')
    return header + navigation + '</nav></header>' + revision_banner + summary + ''.join(cards) + script + '</body></html>'


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    parser.add_argument("--comparison", type=Path, help="resultados.json da execução real")
    args = parser.parse_args()
    target = args.folder / ("COMPARACAO_MODELOS.html" if args.comparison else "REVISAO_PILOTO.html")
    if target.exists():
        raise FileExistsError(f"Caderno já existe: {target}")
    target.write_text(render_notebook(args.folder, args.comparison), encoding="utf-8")
    print(target)
