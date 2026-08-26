"""Extração determinística e contextual dos aspectos usados pelo ABSA.

O extrator identifica candidatos antes da classificação de polaridade. Termos
fortes podem ativar um aspecto sozinhos; termos ambíguos precisam de pelo menos
uma palavra de contexto na mesma oração.
"""

from __future__ import annotations

import re
import unicodedata


ASPECT_RULES: dict[str, dict[str, object]] = {
    "Atendimento": {
        "strong": [
            "atendimento",
            "atendente",
            "atendentes",
            "garçom",
            "garçons",
            "garçonete",
            "garçonetes",
            "serviço",
            "funcionário",
            "funcionários",
            "funcionária",
            "funcionárias",
            "equipe",
            "recepção",
            "espera",
            "demora",
            "demorou",
            "demoram",
            "entrega",
        ],
        "ambiguous": {
            "rápido": ["atendimento", "serviço", "pedido", "entrega", "espera", "preparo", "pronto"],
            "rápida": ["atendimento", "serviço", "entrega", "espera", "preparo"],
            "lento": ["atendimento", "serviço", "pedido", "entrega", "espera", "preparo"],
            "lenta": ["atendimento", "serviço", "entrega", "espera", "preparo"],
            "educado": ["atendente", "garçom", "funcionário", "equipe", "recepção"],
            "educada": ["atendente", "garçonete", "funcionária", "equipe", "recepção"],
            "grosseiro": ["atendente", "garçom", "funcionário", "equipe", "recepção"],
            "grosseira": ["atendente", "garçonete", "funcionária", "equipe", "recepção"],
        },
    },
    "Comida": {
        "strong": [
            "pizza",
            "pizzas",
            "pastel",
            "pastéis",
            "comida",
            "sabor",
            "sabores",
            "saboroso",
            "saborosa",
            "gostoso",
            "gostosa",
            "delicioso",
            "deliciosa",
            "massa",
            "recheio",
            "recheado",
            "recheada",
            "borda",
            "cardápio",
            "bebida",
            "bebidas",
            "suco",
            "carne",
            "sobremesa",
            "prato",
            "pratos",
            "lanche",
            "lanches",
            "porção",
            "porções",
            "tempero",
        ],
        "ambiguous": {
            "frio": ["comida", "pizza", "pastel", "prato", "lanche", "recheio"],
            "fria": ["comida", "pizza", "bebida", "carne", "massa", "porção"],
            "quente": ["comida", "pizza", "pastel", "prato", "lanche", "bebida"],
        },
    },
    "Ambiente": {
        "strong": [
            "ambiente",
            "banheiro",
            "banheiros",
            "limpeza",
            "barulho",
            "música",
            "cadeira",
            "cadeiras",
            "espaço",
            "iluminação",
            "decoração",
            "cobertura",
            "calçada",
            "climatizado",
            "climatizada",
            "aconchegante",
            "confortável",
        ],
        "ambiguous": {
            "mesa": ["suja", "limpa", "apertada", "confortável", "cadeira", "espaço", "organização", "disponível"],
            "mesas": ["sujas", "limpas", "apertadas", "confortáveis", "cadeiras", "espaço", "organização", "disponíveis"],
            "local": ["agradável", "bonito", "limpo", "sujo", "aconchegante", "excelente", "espaçoso", "climatizado", "barulhento"],
            "lugar": ["agradável", "bonito", "limpo", "sujo", "aconchegante", "excelente", "espaçoso", "climatizado", "barulhento"],
        },
    },
    "Preço": {
        "strong": [
            "preço",
            "preços",
            "valor",
            "valores",
            "caro",
            "cara",
            "barato",
            "barata",
            "custo",
            "custou",
            "promoção",
            "cobrança",
            "cobrar",
            "pagar",
            "centavo",
            "centavos",
        ],
        "ambiguous": {
            "conta": ["pagar", "valor", "preço", "cara", "alta", "cobrança", "fechar"],
        },
    },
}


CLAUSE_SPLIT_PATTERN = re.compile(
    r"[.!?;\n]+\s*|\s*,?\s+(?:mas|porém|contudo|entretanto|só\s+que|por\s+outro\s+lado)\s+",
    flags=re.IGNORECASE,
)


def normalize_text(value: str) -> str:
    """Normaliza caixa e acentos sem destruir os limites das palavras."""
    decomposed = unicodedata.normalize("NFD", value.lower())
    return "".join(character for character in decomposed if unicodedata.category(character) != "Mn")


def contains_term(text: str, term: str) -> bool:
    """Procura palavra/expressão completa, evitando correspondência parcial."""
    normalized_text = normalize_text(text)
    normalized_term = normalize_text(term)
    pattern = rf"(?<!\w){re.escape(normalized_term)}(?!\w)"
    return re.search(pattern, normalized_text) is not None


def split_clauses(text: str) -> list[str]:
    return [clause.strip(" ,\t") for clause in CLAUSE_SPLIT_PATTERN.split(text) if clause.strip(" ,\t")]


def find_target(clause: str, rules: dict[str, object]) -> str | None:
    strong_terms = rules.get("strong", [])
    for term in strong_terms:
        if contains_term(clause, str(term)):
            return str(term)

    ambiguous_terms = rules.get("ambiguous", {})
    if not isinstance(ambiguous_terms, dict):
        return None

    for term, contexts in ambiguous_terms.items():
        if not contains_term(clause, str(term)):
            continue
        if any(contains_term(clause, str(context)) for context in contexts):
            return str(term)

    return None


def extract_aspect_candidates(text: str) -> list[dict[str, str]]:
    """Retorna no máximo um candidato de cada aspecto por oração."""
    candidates: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()

    for clause in split_clauses(text):
        for aspect, rules in ASPECT_RULES.items():
            target = find_target(clause, rules)
            if not target:
                continue

            key = (aspect, normalize_text(clause))
            if key in seen:
                continue
            seen.add(key)
            candidates.append({
                "name": aspect,
                "target": target,
                "excerpt": clause,
            })

    return candidates

