"""Coleta estruturada de avaliações do Google Maps por meio da SerpApi."""

from __future__ import annotations

import asyncio
import json
import os
import re
import time
import unicodedata
from dataclasses import dataclass
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, unquote, unquote_plus, urlencode, urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener, urlopen


SERPAPI_ENDPOINT = "https://serpapi.com/search.json"
GOOGLE_DOMAIN = re.compile(r"(^|.*\.)google\.[a-z]{2,3}(\.[a-z]{2})?$", re.I)
DATA_ID = re.compile(r"0x[0-9a-f]+:0x[0-9a-f]+", re.I)
PLACE_DATA_ID = re.compile(r"!1s(0x[0-9a-f]+:0x[0-9a-f]+)", re.I)
PLACE_ID = re.compile(r"^ChI[A-Za-z0-9_-]+$")
COORDINATES = re.compile(r"@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)")


class SerpApiCollectorError(RuntimeError):
    """Erro público e seguro do provedor de coleta."""


@dataclass(frozen=True)
class SerpApiCollection:
    reviews: list[dict]
    warnings: list[str]
    pages: int
    stopped_on_known: bool


def _is_google_maps_url(value: str) -> bool:
    try:
        parsed = urlparse(value)
    except ValueError:
        return False
    host = (parsed.hostname or "").lower()
    if parsed.scheme not in {"http", "https"}:
        return False
    return host == "maps.app.goo.gl" or (
        host == "goo.gl" and parsed.path.lower().startswith("/maps/")
    ) or bool(GOOGLE_DOMAIN.fullmatch(host))


def _short_maps_url(value: str) -> bool:
    parsed = urlparse(value)
    host = (parsed.hostname or "").lower()
    return host == "maps.app.goo.gl" or (
        host == "goo.gl" and parsed.path.lower().startswith("/maps/")
    )


class _GoogleMapsRedirectHandler(HTTPRedirectHandler):
    """Impede que um link curto faça o servidor acessar um host não confiável."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not _is_google_maps_url(newurl):
            raise HTTPError(newurl, code, "Redirecionamento externo bloqueado", headers, fp)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def _open_google_maps_url(request: Request, *, timeout: float):
    return build_opener(_GoogleMapsRedirectHandler()).open(request, timeout=timeout)


def expand_google_maps_url(
    value: str,
    *,
    timeout: float = 20,
    opener: Callable = _open_google_maps_url,
) -> str:
    """Segue links curtos conhecidos sem permitir redirecionamento para outro host."""
    value = (value or "").strip()
    if not _is_google_maps_url(value):
        raise SerpApiCollectorError("Informe uma URL válida de um estabelecimento no Google Maps.")
    if not _short_maps_url(value):
        return value

    request = Request(value, headers={"User-Agent": "Mozilla/5.0"})
    try:
        response = opener(request, timeout=timeout)
        try:
            resolved = response.geturl()
        finally:
            response.close()
    except (HTTPError, URLError, TimeoutError, OSError) as error:
        raise SerpApiCollectorError(
            "Não foi possível abrir o link curto do Google Maps. Gere um novo link em Compartilhar > Copiar link."
        ) from error

    if not _is_google_maps_url(resolved) or _short_maps_url(resolved):
        raise SerpApiCollectorError(
            "O link curto não redirecionou para um estabelecimento válido do Google Maps."
        )
    return resolved


def extract_place_reference(value: str) -> tuple[str, str] | None:
    """Extrai place_id ou data_id sem fazer uma busca adicional na SerpApi."""
    parsed = urlparse(value)
    query = parse_qs(parsed.query)
    for key in ("place_id", "query_place_id"):
        candidate = (query.get(key) or [""])[0].strip()
        if PLACE_ID.fullmatch(candidate):
            return "place_id", candidate

    q = unquote_plus((query.get("q") or [""])[0]).strip()
    if q.lower().startswith("place_id:"):
        candidate = q.split(":", 1)[1].strip()
        if PLACE_ID.fullmatch(candidate):
            return "place_id", candidate

    decoded = unquote(value)
    # URLs completas do Maps podem conter outros data_id antes do local
    # principal (por exemplo, em um parâmetro !5s). O marcador !1s dentro do
    # bloco do estabelecimento identifica a referência que deve ser enviada à
    # Google Maps Reviews API.
    place_candidate = PLACE_DATA_ID.search(decoded)
    if place_candidate:
        return "data_id", place_candidate.group(1).lower()
    candidate = DATA_ID.search(decoded)
    if candidate:
        return "data_id", candidate.group(0).lower()
    return None


def _place_query(value: str) -> tuple[str, str | None]:
    parsed = urlparse(value)
    match = re.search(r"/maps/place/([^/]+)", parsed.path, re.I)
    if not match:
        raise SerpApiCollectorError(
            "A URL não contém um identificador do estabelecimento. Copie novamente o link pela opção Compartilhar do Google Maps."
        )
    query = unquote_plus(match.group(1)).strip()
    if not query:
        raise SerpApiCollectorError(
            "A URL não identifica o estabelecimento no Google Maps."
        )
    coordinates = COORDINATES.search(unquote(value))
    ll = f"@{coordinates.group(1)},{coordinates.group(2)},15z" if coordinates else None
    return query, ll


def _normalized_title(value: str) -> str:
    plain = unicodedata.normalize("NFKD", value or "")
    plain = "".join(char for char in plain if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", plain.casefold()).strip()


def _reference_from_candidate(candidate: dict) -> tuple[str, str] | None:
    data_id = candidate.get("data_id")
    if isinstance(data_id, str) and DATA_ID.fullmatch(data_id):
        return "data_id", data_id.lower()
    place_id = candidate.get("place_id")
    if isinstance(place_id, str) and PLACE_ID.fullmatch(place_id):
        return "place_id", place_id
    return None


def known_review_ids_from_env(value: str | None = None) -> set[str]:
    raw = os.getenv("MINING_KNOWN_REVIEW_IDS", "[]") if value is None else value
    try:
        decoded = json.loads(raw)
    except json.JSONDecodeError as error:
        raise SerpApiCollectorError("A lista interna de avaliações conhecidas está inválida.") from error
    if not isinstance(decoded, list) or any(not isinstance(item, str) for item in decoded):
        raise SerpApiCollectorError("A lista interna de avaliações conhecidas está inválida.")
    return {item.strip() for item in decoded if item.strip()}


class SerpApiCollector:
    def __init__(
        self,
        api_key: str,
        *,
        timeout: float = 45,
        retries: int = 3,
        no_cache: bool = False,
        request_json: Callable[[dict], dict] | None = None,
        short_url_opener: Callable = _open_google_maps_url,
        sleeper: Callable[[float], None] = time.sleep,
    ):
        if not api_key or not api_key.strip():
            raise SerpApiCollectorError(
                "A chave da SerpApi não foi configurada. Defina SERPAPI_API_KEY no arquivo .env."
            )
        if timeout <= 0 or retries < 1:
            raise ValueError("Timeout e tentativas da SerpApi devem ser positivos.")
        self.api_key = api_key.strip()
        self.timeout = timeout
        self.retries = retries
        self.no_cache = no_cache
        self.short_url_opener = short_url_opener
        self.sleeper = sleeper
        self.request_json = request_json or self._request_json

    def _request_json(self, params: dict) -> dict:
        request_params = {**params, "api_key": self.api_key, "output": "json"}
        if self.no_cache:
            request_params["no_cache"] = "true"
        request = Request(
            f"{SERPAPI_ENDPOINT}?{urlencode(request_params)}",
            headers={"Accept": "application/json", "User-Agent": "NEXO-TCC/1.0"},
        )
        last_error = None
        for attempt in range(self.retries):
            try:
                with urlopen(request, timeout=self.timeout) as response:
                    payload = json.loads(response.read().decode("utf-8"))
                if not isinstance(payload, dict):
                    raise SerpApiCollectorError("A SerpApi retornou uma resposta inválida.")
                return payload
            except HTTPError as error:
                if error.code in {401, 403}:
                    raise SerpApiCollectorError(
                        "A chave da SerpApi é inválida ou não possui acesso ao serviço."
                    ) from None
                if error.code == 429:
                    last_error = SerpApiCollectorError(
                        "A cota da SerpApi foi atingida. Verifique o plano e tente novamente."
                    )
                elif 500 <= error.code < 600:
                    last_error = error
                else:
                    raise SerpApiCollectorError(
                        "A SerpApi recusou a solicitação de coleta."
                    ) from None
            except (URLError, TimeoutError, OSError, json.JSONDecodeError) as error:
                last_error = error
            if attempt + 1 < self.retries:
                self.sleeper(2**attempt)

        if isinstance(last_error, SerpApiCollectorError):
            raise last_error
        raise SerpApiCollectorError(
            "A SerpApi está temporariamente indisponível. Tente novamente em alguns minutos."
        ) from None

    def _checked_request(self, params: dict) -> dict:
        payload = self.request_json(params)
        if not isinstance(payload, dict):
            raise SerpApiCollectorError("A SerpApi retornou uma resposta inválida.")
        if payload.get("error"):
            message = str(payload["error"]).casefold()
            if any(marker in message for marker in (
                "credit", "quota", "limit", "run out of searches", "searches left"
            )):
                raise SerpApiCollectorError(
                    "A cota da SerpApi foi atingida. Verifique o plano e tente novamente."
                )
            if "api key" in message:
                raise SerpApiCollectorError(
                    "A chave da SerpApi é inválida ou não possui acesso ao serviço."
                )
            raise SerpApiCollectorError("A SerpApi não conseguiu consultar esse estabelecimento.")
        status = payload.get("search_metadata", {}).get("status")
        if status and status != "Success":
            raise SerpApiCollectorError("A SerpApi não concluiu a consulta de avaliações.")
        return payload

    def _lookup_reference(self, maps_url: str) -> tuple[str, str]:
        query, ll = _place_query(maps_url)
        params = {
            "engine": "google_maps",
            "type": "search",
            "q": query,
            "hl": "pt-BR",
        }
        if ll:
            params["ll"] = ll
        payload = self._checked_request(params)
        place = payload.get("place_results")
        if isinstance(place, dict):
            reference = _reference_from_candidate(place)
            if reference:
                return reference

        candidates = [item for item in payload.get("local_results", []) if isinstance(item, dict)]
        expected = _normalized_title(query)
        exact = [item for item in candidates if _normalized_title(str(item.get("title", ""))) == expected]
        choices = exact or (candidates if len(candidates) == 1 else [])
        for candidate in choices:
            reference = _reference_from_candidate(candidate)
            if reference:
                return reference
        raise SerpApiCollectorError(
            "Não foi possível identificar com segurança o estabelecimento na SerpApi. Gere um novo link em Compartilhar > Copiar link."
        )

    def resolve_reference(self, maps_url: str) -> tuple[str, str]:
        resolved = expand_google_maps_url(
            maps_url, timeout=min(self.timeout, 20), opener=self.short_url_opener
        )
        return extract_place_reference(resolved) or self._lookup_reference(resolved)

    @staticmethod
    def _normalize_review(raw: dict) -> dict | None:
        review_id = raw.get("review_id")
        review_id = review_id.strip() if isinstance(review_id, str) else None
        user = raw.get("user") if isinstance(raw.get("user"), dict) else {}
        author = user.get("name") if isinstance(user.get("name"), str) else ""
        extracted = raw.get("extracted_snippet")
        extracted = extracted if isinstance(extracted, dict) else {}
        text = extracted.get("original")
        if not isinstance(text, str):
            text = raw.get("snippet") if isinstance(raw.get("snippet"), str) else ""
        try:
            rating = float(raw["rating"])
        except (KeyError, TypeError, ValueError):
            return None
        if not 1 <= rating <= 5:
            return None
        date = raw.get("date") or raw.get("iso_date_of_last_edit") or raw.get("iso_date") or ""
        return {
            "review_id": review_id,
            "author": author.strip() or "Usuário do Google",
            "text": text.strip(),
            "rating": rating,
            "date": str(date).strip(),
        }

    def collect(
        self,
        maps_url: str,
        target: int = 100,
        *,
        known_review_ids: set[str] | None = None,
    ) -> SerpApiCollection:
        if target <= 0:
            raise ValueError("TARGET_REVIEWS deve ser positivo.")
        reference_key, reference_value = self.resolve_reference(maps_url)
        known = known_review_ids or set()
        reviews: list[dict] = []
        collected_ids: set[str] = set()
        warnings: list[str] = []
        pages = 0
        next_page_token = None
        used_tokens: set[str] = set()
        expected_total = None
        stopped_on_known = False
        skipped_external = False

        while len(reviews) < target:
            params = {
                "engine": "google_maps_reviews",
                reference_key: reference_value,
                "hl": "pt-BR",
                "sort_by": "newestFirst",
            }
            if next_page_token:
                params["next_page_token"] = next_page_token
                params["num"] = min(20, target - len(reviews))
            payload = self._checked_request(params)
            pages += 1
            if pages == 1:
                total = payload.get("place_info", {}).get("reviews")
                if isinstance(total, int) and total >= 0:
                    expected_total = total

            raw_reviews = payload.get("reviews", [])
            if not isinstance(raw_reviews, list):
                raise SerpApiCollectorError("A SerpApi retornou uma lista de avaliações inválida.")

            page_added = 0
            for raw in raw_reviews:
                if not isinstance(raw, dict):
                    warnings.append("MALFORMED_REVIEW_SKIPPED")
                    continue
                source = raw.get("source")
                if isinstance(source, str) and source.strip().casefold() not in {
                    "", "google", "google maps"
                }:
                    skipped_external = True
                    continue
                review = self._normalize_review(raw)
                if review is None:
                    warnings.append("MALFORMED_REVIEW_SKIPPED")
                    continue
                review_id = review.get("review_id")
                identity = review_id or json.dumps(review, sort_keys=True, ensure_ascii=False)
                if identity in collected_ids:
                    continue
                collected_ids.add(identity)
                reviews.append(review)
                page_added += 1
                if review_id and review_id in known:
                    stopped_on_known = True
                    break
                if len(reviews) >= target:
                    break

            if stopped_on_known or len(reviews) >= target:
                break
            pagination = payload.get("serpapi_pagination")
            token = pagination.get("next_page_token") if isinstance(pagination, dict) else None
            if not token or token in used_tokens:
                break
            used_tokens.add(token)
            next_page_token = token
            if not raw_reviews and page_added == 0:
                break

        if skipped_external:
            warnings.append("NON_GOOGLE_REVIEWS_SKIPPED")
        if (
            not stopped_on_known
            and len(reviews) < target
            and expected_total is not None
            and expected_total > len(reviews)
        ):
            warnings.append("TARGET_NOT_REACHED")
        return SerpApiCollection(
            reviews=reviews[:target],
            warnings=list(dict.fromkeys(warnings)),
            pages=pages,
            stopped_on_known=stopped_on_known,
        )


async def collect_reviews_from_serpapi(
    maps_url: str,
    target: int,
    *,
    warnings: list[str] | None = None,
) -> list[dict]:
    timeout = float(os.getenv("SERPAPI_TIMEOUT_SECONDS", "45"))
    no_cache = os.getenv("SERPAPI_NO_CACHE", "false").strip().casefold() in {"1", "true", "yes"}
    collector = SerpApiCollector(
        os.getenv("SERPAPI_API_KEY", ""), timeout=timeout, no_cache=no_cache
    )
    known = known_review_ids_from_env()
    result = await asyncio.to_thread(
        collector.collect, maps_url, target, known_review_ids=known
    )
    if warnings is not None:
        warnings.extend(result.warnings)
    boundary = "; limite incremental encontrado" if result.stopped_on_known else ""
    print(
        f"[SERPAPI] {len(result.reviews)} avaliações em {result.pages} chamada(s){boundary}.",
        flush=True,
    )
    return result.reviews
