"""Componentes do caderno de comparação, sem acesso a modelos ou serviços externos."""
import html
import json
from pathlib import Path

from comparar_piloto import LABELS, prepare_mentions, sha256
from materializar_rascunho import read_csv

escape = html.escape


def load_comparison(folder: Path, path: Path) -> dict:
    report = json.loads(path.read_text(encoding="utf-8"))
    if report.get("status") != "EXPLORATORIO_CONTRA_RASCUNHO_IA_NAO_GABARITO_HUMANO":
        raise ValueError("Relatório não declara caráter exploratório.")
    for name in ("01_avaliacoes_CEGO.csv", "rascunho_ia.json"):
        if report["input_hashes"].get(name) != sha256(folder / name):
            raise ValueError(f"Dados alterados desde a inferência: {name}. Execute nova comparação.")
    rows = prepare_mentions(read_csv(folder / "01_avaliacoes_CEGO.csv"), json.loads((folder / "rascunho_ia.json").read_text(encoding="utf-8")))
    actual = report["mentions"]
    if len(actual) != len(rows) or len({m["mention_id"] for m in actual}) != len(rows):
        raise ValueError("Relatório com menções ausentes ou duplicadas.")
    expected = {m["mention_id"]: m for m in rows}
    for row in actual:
        reference = expected.get(row["mention_id"])
        if reference is None or any(reference[k] != row[k] for k in ("review_id", "text", "aspect", "reference_ai")):
            raise ValueError("Relatório não corresponde às menções do caderno.")
        for model in ("bertweet", "bertimbau"):
            if row[model]["sentiment"] not in LABELS or not 0 <= row[model]["score"] <= 1:
                raise ValueError("Predição inválida no relatório.")
    return report


def percent(value):
    return f"{100 * value:.1f}%".replace(".", ",")


def badge(prediction, reference=None):
    label = prediction["sentiment"]
    cls = {"Positivo": "pos", "Negativo": "neg", "Neutro": "neu"}[label]
    relation = "" if reference is None else ("Concorda com rascunho" if label == reference else "Diverge do rascunho")
    truncation = '<br><strong class="truncated">Texto truncado</strong>' if prediction.get("truncated") else ""
    return (f'<span class="tag {cls}">{escape(label)}</span><br>'
            f'<small>Softmax: {percent(prediction["score"])}</small><br><small>{relation}</small>{truncation}')


def prediction_cells(row):
    return ''.join(f'<td>{badge(row[model], row["reference_ai"])}</td>' for model in ("bertweet", "bertimbau"))


def overview(report):
    metrics = report["metrics"]["against_ai_draft"]
    tiles = []
    for key, name in (("bertweet", "BERTweet"), ("bertimbau", "BERTimbau ABSA")):
        score = metrics[key]
        tiles.append(f'<article class="metric"><h3>{name}</h3><strong>{percent(score["accuracy"])}</strong>'
                     f'<p>Concordância com rascunho · {score["matches"]}/{score["n"]}</p>'
                     f'<p>F1 macro: {score["f1_macro"]:.3f}<br>Precisão macro: {score["precision_macro"]:.3f}'
                     f'<br>Revocação macro: {score["recall_macro"]:.3f}</p></article>')
    matrices = []
    for key, name in (("bertweet", "BERTweet"), ("bertimbau", "BERTimbau")):
        matrix = metrics[key]["confusion_matrix"]
        lines = ''.join('<tr><th>' + label + '</th>' + ''.join(f'<td class="{"diagonal" if i == j else ""}">{value}</td>' for j, value in enumerate(matrix[i])) + '</tr>' for i, label in enumerate(LABELS))
        matrices.append(f'<div><h3>{name}</h3><table class="matrix"><thead><tr><th>Rascunho ↓ / Modelo →</th>'
                        + ''.join(f'<th>{x}</th>' for x in LABELS) + f'</tr></thead><tbody>{lines}</tbody></table></div>')
    classes = ''.join(f'<tr><th>{label}</th><td>{metrics["bertweet"]["per_class"][label]["support"]}</td>'
                      + ''.join(f'<td>{metrics[model]["per_class"][label][metric]:.3f}</td>'
                                for model in ("bertweet", "bertimbau") for metric in ("precision", "recall", "f1")) + '</tr>' for label in LABELS)
    aspect_rows = ''.join(f'<tr><th>{escape(aspect)}</th><td>{values["bertweet"]["n"]}</td>'
                          + ''.join(f'<td>{percent(values[model]["accuracy"])}</td><td>{values[model]["f1_macro"]:.3f}</td>' for model in ("bertweet", "bertimbau")) + '</tr>'
                          for aspect, values in report["metrics"]["by_aspect"].items())
    groups = ''.join(f'<tr><td>{"Com dúvida" if key == "Sim" else "Sem dúvida marcada"}</td><td>{v["bertweet"]["n"]}</td>'
                    f'<td>{percent(v["bertweet"]["accuracy"])}</td><td>{percent(v["bertimbau"]["accuracy"])}</td></tr>'
                    for key, v in report["metrics"]["by_doubt_ai"].items())
    ext = report["extraction_vs_ai_draft"]
    conf = report["config"]
    trunc = {model: sum(m[model]["truncated"] for m in report["mentions"]) for model in ("bertweet", "bertimbau")}
    return f'''<section class="comparison-overview"><p class="eyebrow">EXECUÇÃO REAL · {escape(conf['device_name'])}</p>
<h2>BERTweet × BERTimbau</h2><p>{report['review_count']} avaliações · {report['mention_count']} pares trecho–aspecto do caderno.
Os modelos divergem entre si em <strong>{report['metrics']['models_disagree']} menções</strong>.</p>
<p class="warning"><strong>Comparação exploratória, não avaliação científica final.</strong> A referência é o rascunho do assistente,
não um gabarito humano. “Concordar” não garante estar correto; uma divergência pode revelar erro no próprio caderno.
Não declare um vencedor definitivo com estes números.</p>
<div class="metrics">{''.join(tiles)}</div>
<p>Ambos recebem o mesmo trecho. O BERTweet classifica sentimento geral do trecho; o BERTimbau recebe também a categoria
e usa a própria categoria como termo-alvo, pois o caderno não anotou termos-alvo. Não é comparação de arquiteturas com treinamento equivalente.
O ensaio controlado não mede extração de aspectos. Limite de 128 tokens por modelo (tokenizadores diferentes).</p>
<p>Truncamento no ensaio: BERTweet {trunc['bertweet']} · BERTimbau {trunc['bertimbau']}.
As porcentagens de softmax nas linhas não são probabilidades calibradas de acerto e não devem ser comparadas entre modelos.</p>
<details><summary>Matrizes de confusão e métricas detalhadas</summary>
<p>Linhas: rascunho IA. Colunas: modelo. Macro é a média das três classes; divisões por zero valem zero.</p>
<div class="matrices">{''.join(matrices)}</div><h3>Por sentimento</h3><div class="scroll"><table class="compact">
<thead><tr><th>Referência IA</th><th>Menções</th><th>TW precisão</th><th>TW revocação</th><th>TW F1</th><th>BI precisão</th><th>BI revocação</th><th>BI F1</th></tr></thead>
<tbody>{classes}</tbody></table></div><h3>Por aspecto</h3><table class="compact"><thead><tr><th>Aspecto</th><th>N</th><th>TW concordância</th><th>TW F1 macro</th><th>BI concordância</th><th>BI F1 macro</th></tr></thead><tbody>{aspect_rows}</tbody></table>
<h3>Dúvidas já marcadas antes de executar os modelos</h3><table class="compact"><thead><tr><th>Grupo</th><th>N</th><th>BERTweet</th><th>BERTimbau</th></tr></thead><tbody>{groups}</tbody></table></details>
<details><summary>Extração de aspectos: diagnóstico separado do classificador</summary><p>O extrator atual foi executado sobre as avaliações completas.
Comparação de presença por avaliação–aspecto com o rascunho: {ext['tp']} coincidências, {ext['fp']} presenças extras e {ext['fn']} ausências.
Precisão: {percent(ext['precision'])}; revocação: {percent(ext['recall'])}; F1: {ext['f1']:.3f}.
Isso ainda não é uma métrica ponta a ponta de sentimento. Abra o fluxo atual em cada avaliação para inspecionar as evidências.</p></details>
<details><summary>Configuração e limitações de reprodução</summary><ul>{''.join(f'<li>{escape(x)}</li>' for x in report['limitations'])}</ul>
<p>Execução: {escape(report['created_at_utc'])}<br>PyTorch {escape(conf['torch'])} · Transformers {escape(conf['transformers'])} · seed {conf['seed']} · batch {conf['batch_size']}.</p>
<p class="hash">BERTweet revisão: {escape(conf['bertweet_revision'])}<br>BERTweet SHA-256: {escape(conf['bertweet_checkpoint_sha256'])}<br>BERTimbau SHA-256: {escape(conf['bertimbau_checkpoint_sha256'])}</p></details>
<div class="filters" aria-label="Filtros de comparação"><button data-filter="all" aria-pressed="true">Todos</button>
<button data-filter="models" aria-pressed="false">Modelos divergem</button><button data-filter="reference" aria-pressed="false">Divergência do rascunho</button>
<button data-filter="doubt" aria-pressed="false">Dúvidas do caderno</button><label>Buscar <input id="comparison-search" type="search" placeholder="Trecho, aspecto ou ID"></label></div>
<p id="filter-count" role="status">{report['mention_count']} menções no ensaio controlado.</p></section>'''


def operational_panel(report, review_id):
    record = next(r for r in report["operational_reviews"] if r["review_id"] == review_id)
    rows = [r for r in report["operational_candidates"] if r["review_id"] == review_id]
    missing = ', '.join(record["missing_vs_draft"]) or 'nenhum'
    extra = ', '.join(record["extra_vs_draft"]) or 'nenhum'
    lines = ''.join(f'<tr><td>{escape(r["text"])}</td><td>{escape(r["aspect"])}<br><small>Alvo: {escape(r["target"])}</small></td>'
                    f'<td>{badge(r["bertweet"])}</td><td>{badge(r["bertimbau"])}</td></tr>' for r in rows)
    return f'''<details class="operational"><summary>Fluxo atual sobre a avaliação completa · {len(rows)} candidatos de aspecto</summary>
<p><strong>BERTweet geral:</strong> {badge(record['bertweet_overall'])}</p>
<p>O BERTimbau não produz aqui um sentimento geral único: ele classifica os aspectos encontrados.
Abaixo, o BERTweet também é aplicado aos trechos extraídos como baseline adicional.</p>
<p>Aspectos ausentes em relação ao caderno: <strong>{escape(missing)}</strong>.<br>
Aspectos extras em relação ao caderno: <strong>{escape(extra)}</strong>.</p>
<div class="scroll"><table class="operational-table"><thead><tr><th>Trecho do extrator</th><th>Aspecto / alvo</th><th>BERTweet sobre trecho</th><th>BERTimbau ABSA</th></tr></thead><tbody>{lines}</tbody></table></div>
<p>Essas previsões não entram na métrica dos pares fornecidos pelo caderno. Discordâncias de extração também precisam de revisão humana.</p></details>'''


STYLE = '''
body{max-width:1440px}.metrics,.matrices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin:20px 0}
.metric{background:#f1f5fb;border:1px solid #d6e0ef;border-radius:10px;padding:20px}.metric h3{margin:0 0 12px}.metric strong{font-size:2.5rem;color:#163e71}
.eyebrow{font-size:.78rem;letter-spacing:.08em;color:#53667c}.matrix td{width:auto;text-align:center}.matrix .diagonal{background:#dff0e7;font-weight:700}
table.compact td,table.matrix td{width:auto;min-width:0}.matrices>div{overflow:auto}.controlled td:nth-child(2){width:36%}.controlled td:nth-child(3){min-width:100px}.controlled td:nth-child(4),.controlled td:nth-child(5){min-width:140px}
.controlled tr.model-diff{background:#fff8eb}.controlled tr.reference-diff td:first-child{border-left:4px solid #c58113}.truncated{color:#8f4300;font-size:.75rem}
details{margin:18px 0;padding:14px;border:1px solid #d9e2ef;border-radius:8px}summary{cursor:pointer;font-weight:650}.hash{overflow-wrap:anywhere;font-size:.8rem}
.filters{display:flex;gap:10px;flex-wrap:wrap;margin-top:24px;align-items:center}.filters button,.filters input{padding:10px;border:1px solid #b3c3d7;border-radius:7px;background:white;color:#20344d}.filters button{cursor:pointer}.filters button[aria-pressed=true]{background:#203c65;color:white}
.operational{background:#f8fafc}.operational-table td:nth-child(1){width:48%;white-space:pre-wrap}.operational-table td:nth-child(2){width:auto}.pending{margin-top:20px}
[hidden]{display:none!important}@media(max-width:800px){body{padding:12px}.metrics,.matrices{grid-template-columns:1fr}section,header{padding:16px}}
'''

SCRIPT = '''<script>
(() => {
  let mode = 'all';
  const search = document.querySelector('#comparison-search');
  function refresh() {
    const query = search.value.trim().toLocaleLowerCase('pt-BR');
    let count = 0;
    document.querySelectorAll('section[data-review]').forEach(section => {
      let visible = 0;
      section.querySelectorAll('tr[data-mention]').forEach(row => {
        const matches = (mode === 'all' || row.dataset[mode] === '1') &&
          (section.dataset.review + ' ' + row.textContent).toLocaleLowerCase('pt-BR').includes(query);
        row.hidden = !matches;
        if (matches) { visible++; count++; }
      });
      section.hidden = visible === 0 && (mode !== 'all' || query !== '');
    });
    document.querySelector('#filter-count').textContent = count + ' menções visíveis no ensaio controlado.';
  }
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    mode = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    refresh();
  }));
  search.addEventListener('input', refresh);
})();
</script>'''
