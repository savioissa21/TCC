"""Coleta estruturada de avaliações do Google Maps pela Outscraper."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from serpapi_collector import known_review_ids_from_env


OUTSCRAPER_ENDPOINT = "https://api.outscraper.cloud/google-maps-reviews"


class OutscraperCollectorError(RuntimeError):
    """Erro público e seguro do provedor de coleta."""


@dataclass(frozen=True)
class OutscraperCollection:
    reviews: list[dict]
    warnings: list[str]
    stopped_on_known: bool


def _stable_review_id(raw: dict, place: dict) -> str | None:
    for field in ("review_id", "reviewId", "google_review_id"):
        value = raw.get(field)
        if isinstance(value, str) and value.strip():
            return value.strip()

    place_id = raw.get("google_id") or place.get("google_id") or place.get("place_id")
    author_id = raw.get("autor_id") or raw.get("author_id")
    if place_id and author_id:
        identity = f"{place_id}|{author_id}"
        return "outscraper:" + hashlib.sha256(identity.encode("utf-8")).hexdigest()

    link = raw.get("review_link")
    if isinstance(link, str) and link.strip():
        return "outscraper:" + hashlib.sha256(link.strip().encode("utf-8")).hexdigest()
    return None


def _review_date(raw: dict) -> str:
    for field in ("review_datetime_utc", "review_datetime", "review_date"):
        value = raw.get(field)
        if isinstance(value, str) and value.strip():
            return value.strip()
    timestamp = raw.get("review_timestamp")
    try:
        return datetime.fromtimestamp(float(timestamp), timezone.utc).isoformat()
    except (TypeError, ValueError, OSError, OverflowError):
        return ""


def _normalize_review(raw: dict, place: dict) -> dict | None:
    try:
        rating = float(raw["review_rating"])
    except (KeyError, TypeError, ValueError):
        return None
    if not 1 <= rating <= 5:
        return None

    author = raw.get("autor_name") or raw.get("author_name") or raw.get("name") or ""
    text = raw.get("review_text")
    return {
        "review_id": _stable_review_id(raw, place),
        "author": str(author).strip(),
        "text": text.strip() if isinstance(text, str) else "",
        "rating": rating,
        "date": _review_date(raw),
    }


def _extract_places(payload) -> list[dict]:
    if isinstance(payload, dict):
        if isinstance(payload.get("reviews_data"), list):
            return [payload]
        if "data" in payload:
            return _extract_places(payload["data"])
        return []
    if isinstance(payload, list):
        places: list[dict] = []
        for item in payload:
            places.extend(_extract_places(item))
        return places
    return []


class OutscraperCollector:
    def __init__(
        self,
        api_key: str,
        *,
        timeout: float = 240,
        request_json: Callable[[dict], object] | None = None,
    ):
        if not api_key or not api_key.strip():
            raise OutscraperCollectorError(
                "A chave da Outscraper não foi configurada. Defina OUTSCRAPER_API_KEY no arquivo .env."
            )
        if timeout <= 0:
            raise ValueError("O timeout da Outscraper deve ser positivo.")
        self.api_key = api_key.strip()
        self.timeout = timeout
        self.request_json = request_json or self._request_json

    def _request_json(self, params: dict):
        request = Request(
            f"{OUTSCRAPER_ENDPOINT}?{urlencode(params)}",
            headers={
                "Accept": "application/json",
                "User-Agent": "NEXO-TCC/1.0",
                "X-API-KEY": self.api_key,
            },
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                if response.status == 204:
                    return {"status": "Success", "data": []}
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            if error.code == 401:
                raise OutscraperCollectorError(
                    "A chave da Outscraper é inválida ou não possui acesso ao serviço."
                ) from None
            if error.code == 402:
                raise OutscraperCollectorError(
                    "O saldo ou a configuração de cobrança da Outscraper precisa ser verificado."
                ) from None
            if error.code == 422:
                raise OutscraperCollectorError(
                    "A Outscraper não reconheceu o estabelecimento informado."
                ) from None
            raise OutscraperCollectorError(
                "A Outscraper recusou a solicitação de coleta."
            ) from None
        except (URLError, TimeoutError, OSError, json.JSONDecodeError):
            raise OutscraperCollectorError(
                "A Outscraper está temporariamente indisponível. Tente novamente em alguns minutos."
            ) from None

    def collect(
        self,
        maps_url: str,
        target: int = 100,
        *,
        known_review_ids: set[str] | None = None,
    ) -> OutscraperCollection:
        if target <= 0 or target > 500:
            raise ValueError("TARGET_REVIEWS deve estar entre 1 e 500 para a Outscraper.")
        if not isinstance(maps_url, str) or not maps_url.strip():
            raise OutscraperCollectorError("Informe uma URL válida de um estabelecimento no Google Maps.")

        payload = self.request_json({
            "query": maps_url.strip(),
            "reviewsLimit": target,
            "limit": 1,
            "sort": "newest",
            "language": "pt",
            "region": "BR",
            "async": "false",
        })
        if isinstance(payload, dict):
            status = str(payload.get("status", "")).strip().casefold()
            if status and status not in {"success", "completed", "done"}:
                raise OutscraperCollectorError("A Outscraper não concluiu a coleta de avaliações.")
            if payload.get("error"):
                raise OutscraperCollectorError("A Outscraper não conseguiu consultar esse estabelecimento.")

        places = _extract_places(payload)
        if not places:
            return OutscraperCollection([], [], False)
        place = places[0]
        raw_reviews = place.get("reviews_data")
        if not isinstance(raw_reviews, list):
            raise OutscraperCollectorError("A Outscraper retornou uma lista de avaliações inválida.")

        known = known_review_ids or set()
        reviews: list[dict] = []
        seen: set[str] = set()
        warnings: list[str] = []
        stopped_on_known = False
        for raw in raw_reviews:
            if not isinstance(raw, dict):
                warnings.append("MALFORMED_REVIEW_SKIPPED")
                continue
            review = _normalize_review(raw, place)
            if review is None:
                warnings.append("MALFORMED_REVIEW_SKIPPED")
                continue
            identity = review["review_id"] or json.dumps(review, sort_keys=True, ensure_ascii=False)
            if identity in seen:
                continue
            seen.add(identity)
            reviews.append(review)
            if review["review_id"] and review["review_id"] in known:
                stopped_on_known = True
                break
            if len(reviews) >= target:
                break

        expected_total = place.get("reviews")
        if (
            not stopped_on_known
            and len(reviews) < target
            and isinstance(expected_total, int)
            and expected_total > len(reviews)
        ):
            warnings.append("TARGET_NOT_REACHED")
        return OutscraperCollection(
            reviews=reviews,
            warnings=list(dict.fromkeys(warnings)),
            stopped_on_known=stopped_on_known,
        )


async def collect_reviews_from_outscraper(
    maps_url: str,
    target: int,
    *,
    warnings: list[str] | None = None,
) -> list[dict]:
    timeout = float(os.getenv("OUTSCRAPER_TIMEOUT_SECONDS", "240"))
    collector = OutscraperCollector(
        os.getenv("OUTSCRAPER_API_KEY", ""),
        timeout=timeout,
    )
    result = await asyncio.to_thread(
        collector.collect,
        maps_url,
        target,
        known_review_ids=known_review_ids_from_env(),
    )
    if warnings is not None:
        warnings.extend(result.warnings)
    boundary = "; parada no primeiro ID conhecido" if result.stopped_on_known else ""
    print(
        f"[OUTSCRAPER] {len(result.reviews)} avaliações recebidas{boundary}.",
        flush=True,
    )
    return result.reviews
