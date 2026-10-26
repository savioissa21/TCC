"""Coleta avaliações do Google Maps com um Actor executado na Apify."""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
from dataclasses import dataclass
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from serpapi_collector import (
    SerpApiCollectorError,
    expand_google_maps_url,
    known_review_ids_from_env,
)


APIFY_ACTOR_ID = "compass~google-maps-reviews-scraper"
APIFY_ENDPOINT = (
    "https://api.apify.com/v2/actors/"
    f"{APIFY_ACTOR_ID}/run-sync-get-dataset-items"
)


class ApifyCollectorError(RuntimeError):
    """Erro público e seguro do provedor de coleta."""


@dataclass(frozen=True)
class ApifyCollection:
    reviews: list[dict]
    warnings: list[str]
    known_reviews_skipped: int
    google_rating: float | None
    google_review_count: int | None
    skipped_without_text: int
    raw_reviews_requested: int


def _stable_review_id(raw: dict) -> str | None:
    review_id = raw.get("reviewId")
    if isinstance(review_id, str) and review_id.strip():
        return review_id.strip()

    review_url = raw.get("reviewUrl")
    if isinstance(review_url, str) and review_url.strip():
        value = review_url.strip().encode("utf-8")
        return "apify:" + hashlib.sha256(value).hexdigest()

    identity_fields = (
        raw.get("placeId"),
        raw.get("reviewerId"),
        raw.get("publishedAtDate"),
        raw.get("stars"),
        raw.get("text"),
    )
    if any(value is not None and value != "" for value in identity_fields):
        identity = json.dumps(identity_fields, ensure_ascii=False, separators=(",", ":"))
        return "apify:" + hashlib.sha256(identity.encode("utf-8")).hexdigest()
    return None


def _normalize_review(raw: dict) -> dict | None:
    try:
        rating = float(raw["stars"])
    except (KeyError, TypeError, ValueError):
        return None
    if not 1 <= rating <= 5:
        return None

    author = raw.get("name")
    text = raw.get("text")
    date = raw.get("publishedAtDate") or raw.get("publishAt") or ""
    return {
        "review_id": _stable_review_id(raw),
        "author": author.strip() if isinstance(author, str) and author.strip() else "Usuário do Google",
        "text": text.strip() if isinstance(text, str) else "",
        "rating": rating,
        "date": str(date).strip(),
    }


class ApifyCollector:
    def __init__(
        self,
        api_token: str,
        *,
        timeout: float = 300,
        max_total_charge_usd: float = 1.0,
        review_fetch_multiplier: int = 3,
        max_raw_reviews: int = 500,
        request_json: Callable[[dict, int], object] | None = None,
        short_url_opener: Callable | None = None,
    ):
        if not api_token or not api_token.strip():
            raise ApifyCollectorError(
                "O token da Apify não foi configurado. Defina APIFY_API_TOKEN no arquivo .env."
            )
        if timeout <= 0:
            raise ValueError("O timeout da Apify deve ser positivo.")
        if max_total_charge_usd <= 0:
            raise ValueError("O limite de gasto da Apify deve ser positivo.")
        if review_fetch_multiplier <= 0:
            raise ValueError("O multiplicador de coleta da Apify deve ser positivo.")
        if max_raw_reviews <= 0 or max_raw_reviews > 500:
            raise ValueError("APIFY_MAX_RAW_REVIEWS deve estar entre 1 e 500.")
        self.api_token = api_token.strip()
        self.timeout = timeout
        self.max_total_charge_usd = max_total_charge_usd
        self.review_fetch_multiplier = review_fetch_multiplier
        self.max_raw_reviews = max_raw_reviews
        self.short_url_opener = short_url_opener
        self.request_json = request_json or self._request_json

    def _request_json(self, actor_input: dict, target: int):
        actor_timeout = max(1, min(int(self.timeout), 300))
        params = {
            "timeout": actor_timeout,
            "maxItems": target,
            "maxTotalChargeUsd": self.max_total_charge_usd,
            "clean": "true",
            "format": "json",
        }
        request = Request(
            f"{APIFY_ENDPOINT}?{urlencode(params)}",
            data=json.dumps(actor_input, ensure_ascii=False).encode("utf-8"),
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {self.api_token}",
                "Content-Type": "application/json; charset=utf-8",
                "User-Agent": "NEXO-TCC/1.0",
            },
            method="POST",
        )
        try:
            with urlopen(request, timeout=self.timeout + 15) as response:
                return json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            if error.code in {401, 403}:
                raise ApifyCollectorError(
                    "O token da Apify é inválido ou não possui acesso ao coletor."
                ) from None
            if error.code == 402:
                raise ApifyCollectorError(
                    "Os créditos gratuitos da Apify acabaram. Aguarde a renovação ou verifique o plano."
                ) from None
            if error.code == 408:
                raise ApifyCollectorError(
                    "A coleta da Apify excedeu o tempo limite. Tente novamente."
                ) from None
            if error.code == 429:
                raise ApifyCollectorError(
                    "O limite temporário de requisições da Apify foi atingido. Tente novamente em alguns minutos."
                ) from None
            raise ApifyCollectorError("A Apify recusou a solicitação de coleta.") from None
        except (URLError, TimeoutError, OSError, json.JSONDecodeError):
            raise ApifyCollectorError(
                "A Apify está temporariamente indisponível. Tente novamente em alguns minutos."
            ) from None

    def _expand_url(self, maps_url: str) -> str:
        try:
            kwargs = {"timeout": min(self.timeout, 20)}
            if self.short_url_opener is not None:
                kwargs["opener"] = self.short_url_opener
            return expand_google_maps_url(maps_url, **kwargs)
        except SerpApiCollectorError as error:
            raise ApifyCollectorError(str(error)) from None

    def collect(
        self,
        maps_url: str,
        target: int = 100,
        *,
        known_review_ids: set[str] | None = None,
    ) -> ApifyCollection:
        if target <= 0 or target > 500:
            raise ValueError("TARGET_REVIEWS deve estar entre 1 e 500 para a Apify.")

        resolved_url = self._expand_url(maps_url)
        fetch_target = min(
            self.max_raw_reviews,
            max(target, target * self.review_fetch_multiplier),
        )
        actor_input = {
            "startUrls": [{"url": resolved_url}],
            "maxReviews": fetch_target,
            "reviewsSort": "newest",
            "reviewsOrigin": "google",
            "language": "pt-BR",
            "personalData": True,
        }
        payload = self.request_json(actor_input, fetch_target)
        if not isinstance(payload, list):
            raise ApifyCollectorError("A Apify retornou uma resposta inválida.")

        known = known_review_ids or set()
        reviews: list[dict] = []
        seen: set[str] = set()
        warnings: list[str] = []
        known_reviews_skipped = 0
        expected_total = None
        google_rating = None
        skipped_without_text = 0

        for raw in payload:
            if not isinstance(raw, dict):
                warnings.append("MALFORMED_REVIEW_SKIPPED")
                continue
            if raw.get("error") or raw.get("errorDescription"):
                raise ApifyCollectorError(
                    "A Apify não conseguiu consultar esse estabelecimento."
                )
            origin = raw.get("reviewOrigin")
            if isinstance(origin, str) and origin.casefold() != "google":
                warnings.append("NON_GOOGLE_REVIEWS_SKIPPED")
                continue

            raw_total = raw.get("reviewsCount")
            try:
                parsed_total = int(raw_total)
                if parsed_total >= 0:
                    expected_total = max(parsed_total, expected_total or 0)
            except (TypeError, ValueError):
                pass

            raw_rating = raw.get("totalScore")
            try:
                parsed_rating = float(raw_rating)
                if 0 <= parsed_rating <= 5:
                    google_rating = parsed_rating
            except (TypeError, ValueError):
                pass

            normalized = _normalize_review(raw)
            if normalized is None:
                warnings.append("MALFORMED_REVIEW_SKIPPED")
                continue

            identity = normalized["review_id"] or json.dumps(
                normalized, sort_keys=True, ensure_ascii=False
            )
            if identity in seen:
                continue
            seen.add(identity)

            review_id = normalized["review_id"]
            already_known = bool(review_id and review_id in known)
            if not normalized["text"]:
                skipped_without_text += 1
                if already_known:
                    known_reviews_skipped += 1
                continue

            if already_known:
                known_reviews_skipped += 1
                continue

            reviews.append(normalized)
            if len(reviews) >= target:
                break

        if (
            len(reviews) < target
            and len(payload) < fetch_target
            and expected_total is not None
            and expected_total > len(payload)
        ):
            warnings.append("TARGET_NOT_REACHED")

        return ApifyCollection(
            reviews=reviews,
            warnings=list(dict.fromkeys(warnings)),
            known_reviews_skipped=known_reviews_skipped,
            google_rating=google_rating,
            google_review_count=expected_total,
            skipped_without_text=skipped_without_text,
            raw_reviews_requested=fetch_target,
        )


async def collect_reviews_from_apify(
    maps_url: str,
    target: int,
    *,
    warnings: list[str] | None = None,
    metadata: dict | None = None,
) -> list[dict]:
    timeout = float(os.getenv("APIFY_TIMEOUT_SECONDS", "300"))
    max_total_charge_usd = float(os.getenv("APIFY_MAX_TOTAL_CHARGE_USD", "1.0"))
    review_fetch_multiplier = int(os.getenv("APIFY_REVIEW_FETCH_MULTIPLIER", "3"))
    max_raw_reviews = int(os.getenv("APIFY_MAX_RAW_REVIEWS", "500"))
    collector = ApifyCollector(
        os.getenv("APIFY_API_TOKEN", ""),
        timeout=timeout,
        max_total_charge_usd=max_total_charge_usd,
        review_fetch_multiplier=review_fetch_multiplier,
        max_raw_reviews=max_raw_reviews,
    )
    result = await asyncio.to_thread(
        collector.collect,
        maps_url,
        target,
        known_review_ids=known_review_ids_from_env(),
    )
    if warnings is not None:
        warnings.extend(result.warnings)
    if metadata is not None:
        metadata.update({
            "googleRating": result.google_rating,
            "googleReviewCount": result.google_review_count,
            "reviewsWithoutText": result.skipped_without_text,
            "knownReviewsSkipped": result.known_reviews_skipped,
            "rawReviewsRequested": result.raw_reviews_requested,
        })
    print(
        f"[APIFY] {len(result.reviews)} comentários recebidos; "
        f"{result.skipped_without_text} avaliações sem texto e "
        f"{result.known_reviews_skipped} comentários conhecidos ignorados.",
        flush=True,
    )
    return result.reviews
