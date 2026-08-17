"""
AI service for BuildFlow Africa.

Two rules the whole file is built around:

1. The model proposes scope, quantities and prose. It never returns a price, a total or a margin.
2. When no provider is configured the service still answers, using deterministic construction
   logic, so the product works without a key and behaves identically in tests.
"""
from __future__ import annotations

import json
import math
import os
import re
import time
from typing import Any, Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

APP_VERSION = "1.0.0"
PROVIDER_KEY = os.getenv("OPENAI_API_KEY", "").strip()
PROVIDER_BASE = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
PROVIDER_MODEL = os.getenv("AI_MODEL", "gpt-4o-mini")
REQUEST_TIMEOUT = float(os.getenv("AI_TIMEOUT_SECONDS", "25"))

app = FastAPI(title="BuildFlow Africa AI", version=APP_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|backend)(:\d+)?",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Trace-Id", "Accept", "Origin"],
)

SYSTEM_PROMPT = (
    "You are a quantity surveyor working in Ghana. You produce construction scope and quantities "
    "only. You must never output prices, rates, totals, margins or currency amounts: those are "
    "calculated by the platform from the contractor's own price book. Use metric units common in "
    "Ghanaian practice (m, m2, m3, bag, trip, day, item, sheet, litre). Return strict JSON."
)


# --------------------------------------------------------------------------- models
class ScopeRequest(BaseModel):
    prompt: str = Field(min_length=8)
    country: str = "Ghana"
    region: str | None = None
    parameters: dict[str, Any] = Field(
        default_factory=dict,
        description="Answers the estimator confirmed in the guided questionnaire. A value here is "
        "a stated fact and overrides anything inferred from the prose.",
    )


class ScopeItem(BaseModel):
    description: str
    quantity: float
    unit: str
    cost_type: Literal["MATERIAL", "LABOUR", "EQUIPMENT", "SUBCONTRACTOR"] = "MATERIAL"
    waste_percent: float = 0


class ScopeSection(BaseModel):
    name: str
    items: list[ScopeItem]


class ScopeResponse(BaseModel):
    project_type: str
    basis: dict[str, Any] = {}
    sections: list[ScopeSection]
    notes: list[str] = []
    provider: str
    latency_ms: int


class Question(BaseModel):
    id: str
    label: str
    help: str = ""
    type: Literal["number", "text", "choice", "boolean"] = "number"
    unit: str | None = None
    options: list[str] = []
    default: Any = None
    required: bool = True


class QuestionnaireRequest(BaseModel):
    prompt: str = Field(min_length=3)
    region: str | None = None


class QuestionnaireResponse(BaseModel):
    project_type: str
    questions: list[Question]
    detected: dict[str, Any] = {}
    provider: str


class ExtractRequest(BaseModel):
    content: str = Field(min_length=4)
    kind: Literal["paste", "csv", "text"] = "paste"


class ExtractResponse(BaseModel):
    sections: list["ScopeSection"]
    rows_read: int
    rows_skipped: int
    notes: list[str] = []
    provider: str


class ReviewLine(BaseModel):
    description: str
    quantity: float = 0
    unit: str = ""
    cost_type: str = "MATERIAL"
    waste_percent: float = 0
    rate_age_days: int | None = None


class ReviewRequest(BaseModel):
    lines: list[ReviewLine]
    gross_margin_percent: float | None = None
    contingency_percent: float = 0


class ReviewIssue(BaseModel):
    id: str
    severity: Literal["high", "medium", "low"]
    title: str
    detail: str


class ReviewResponse(BaseModel):
    issues: list[ReviewIssue]
    provider: str


class AssistantRequest(BaseModel):
    question: str = Field(min_length=3)
    facts: dict[str, Any] = Field(
        default_factory=dict,
        description="Aggregates the backend already computed. The model may summarise these but "
        "must not invent new figures.",
    )


class AssistantResponse(BaseModel):
    headline: str
    detail: str
    provider: str


# --------------------------------------------------------------------------- provider
def _call_provider(messages: list[dict[str, str]], schema_hint: str) -> dict[str, Any] | None:
    if not PROVIDER_KEY:
        return None
    payload = {
        "model": PROVIDER_MODEL,
        "messages": messages + [{"role": "system", "content": schema_hint}],
        "response_format": {"type": "json_object"},
        "temperature": 0.2,
    }
    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            response = client.post(
                f"{PROVIDER_BASE}/chat/completions",
                headers={"Authorization": f"Bearer {PROVIDER_KEY}"},
                json=payload,
            )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        return json.loads(content)
    except Exception:  # noqa: BLE001 - a provider failure must never take the product down
        return None


# Units you cannot buy a fraction of. Half a tipper trip is still a whole trip to pay for.
_WHOLE_UNITS = {"trip", "no", "pcs", "item", "lot", "sheet", "length"}


def _countable(quantity: float, unit: str) -> float:
    if unit in _WHOLE_UNITS:
        return float(math.ceil(quantity))
    return round(quantity, 2)


def _strip_money(value: str) -> str:
    """Defence in depth: remove any currency the model slipped into a description."""
    return re.sub(r"(?i)\b(ghs|usd|ngn|kes)\s?[\d,.]+", "", value).strip()


def _as_question(raw: dict[str, Any]) -> Question | None:
    try:
        question_type = str(raw.get("type", "number")).lower()
        if question_type not in {"number", "text", "choice", "boolean"}:
            question_type = "number"
        return Question(
            id=re.sub(r"[^a-z0-9_]+", "_", str(raw.get("id", ""))).strip("_")[:64],
            label=str(raw.get("label", ""))[:140],
            help=str(raw.get("help", ""))[:240],
            type=question_type,
            unit=str(raw["unit"])[:24] if raw.get("unit") else None,
            options=[str(option)[:80] for option in raw.get("options", [])][:8],
            default=raw.get("default"),
            required=bool(raw.get("required", True)),
        )
    except (TypeError, ValueError):
        return None


def _as_scope_item(raw: dict[str, Any]) -> ScopeItem | None:
    try:
        cost_type = str(raw.get("cost_type", "MATERIAL")).upper()
        if cost_type not in {"MATERIAL", "LABOUR", "EQUIPMENT", "SUBCONTRACTOR"}:
            cost_type = _classify(str(raw.get("description", "")))
        return ScopeItem(
            description=_strip_money(str(raw.get("description", "")))[:200],
            quantity=max(0, float(raw.get("quantity", 0) or 0)),
            unit=str(raw.get("unit", "item"))[:20],
            cost_type=cost_type,
            waste_percent=max(0, min(100, float(raw.get("waste_percent", 0) or 0))),
        )
    except (TypeError, ValueError):
        return None


# --------------------------------------------------------------------------- deterministic core
#
# A factor is the *net* quantity a unit of the measured work consumes, and nothing else. Cutting
# and breakage belong in the waste column, which the estimate applies once when it prices the line.
# A factor that quietly carried its own allowance would charge that allowance twice, and the second
# charge would be invisible: the sheet would show 10% waste while billing 21%.
#
# Where a factor is above 1 it is because of geometry, not waste. Roofing sheets lap over one
# another, so a square metre of roof takes more than a square metre of sheet; floor tiles do not,
# so tiling is 1.0.
FACTORS = {
    "tiling": [
        ("60x60 porcelain floor tiles", 1.0, "m2", "MATERIAL", 10),
        ("Tile adhesive 25kg", 0.22, "bag", "MATERIAL", 5),
        ("Tile grout 5kg", 0.06, "bag", "MATERIAL", 5),
        ("Tiling labour", 1.0, "m2", "LABOUR", 0),
        ("Transport to site", 0.01, "trip", "EQUIPMENT", 0),
    ],
    "blockwork": [
        ("6-inch sandcrete blocks", 12.5, "item", "MATERIAL", 5),
        ("Cement for mortar", 0.35, "bag", "MATERIAL", 3),
        ("Sharp sand", 0.02, "trip", "MATERIAL", 0),
        ("Masonry labour", 0.25, "day", "LABOUR", 0),
    ],
    "painting": [
        ("Emulsion paint", 0.02, "item", "MATERIAL", 5),
        ("Wall putty 20kg", 0.05, "bag", "MATERIAL", 5),
        ("Painting labour, two coats", 1.0, "m2", "LABOUR", 0),
    ],
    "roofing": [
        ("Aluzinc roofing sheets", 1.15, "m2", "MATERIAL", 8),
        ("Roofing timber", 1.4, "m", "MATERIAL", 5),
        ("Roofing labour", 1.0, "m2", "LABOUR", 0),
        ("Scaffolding hire", 0.02, "week", "EQUIPMENT", 0),
    ],
}

TRADE_KEYWORDS = {
    "tiling": ("til",),
    "blockwork": ("wall", "block", "fence", "boundary"),
    "painting": ("paint",),
    "roofing": ("roof",),
}


def _numbers(text: str) -> dict[str, float]:
    area = re.search(r"([\d.]+)\s*(?:m2|m²|square met)", text)
    length = re.search(r"([\d.]+)\s*(?:m|metre|meter)s?\s*(?:long|length)", text)
    height = re.search(r"([\d.]+)\s*(?:m|metre|meter)s?\s*high", text)
    basis: dict[str, float] = {}
    if area:
        basis["area"] = float(area.group(1))
    if length:
        basis["length"] = float(length.group(1))
    if height:
        basis["height"] = float(height.group(1))
    if "length" in basis and "height" in basis:
        basis["wall_area"] = basis["length"] * basis["height"] * 2
    return basis


def _deterministic_scope(
    prompt: str, parameters: dict[str, Any] | None = None
) -> tuple[str, dict[str, Any], list[ScopeSection], list[str]]:
    text = prompt.lower()
    basis = _numbers(text)

    # A confirmed answer is a stated fact and outranks anything read out of the prose.
    stated = {key: value for key, value in (parameters or {}).items()
              if isinstance(value, (int, float)) and value}
    basis.update(stated)
    if "length" in stated and "height" in stated:
        basis["wall_area"] = float(stated["length"]) * float(stated["height"]) * 2

    quantity_base = basis.get("area") or basis.get("wall_area") or 100.0
    sections: list[ScopeSection] = []
    notes: list[str] = []
    project_type = "General construction"

    for trade, keywords in TRADE_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            project_type = trade.capitalize()
            sections.append(
                ScopeSection(
                    name=f"{trade.capitalize()} works",
                    items=[
                        ScopeItem(
                            description=description,
                            quantity=_countable(factor * quantity_base, unit),
                            unit=unit,
                            cost_type=cost_type,
                            waste_percent=waste,
                        )
                        for description, factor, unit, cost_type, waste in FACTORS[trade]
                    ],
                )
            )

    if not sections:
        sections.append(
            ScopeSection(
                name="Suggested scope",
                items=[
                    ScopeItem(description="Site clearing and setting out", quantity=1, unit="lot", cost_type="LABOUR"),
                    ScopeItem(description="Materials supply", quantity=1, unit="lot"),
                    ScopeItem(description="Skilled labour", quantity=1, unit="lot", cost_type="LABOUR"),
                    ScopeItem(description="Transport to site", quantity=2, unit="trip", cost_type="EQUIPMENT"),
                ],
            )
        )
        notes.append("The description did not match a known trade, so a general scope was drafted.")

    waste_override = (parameters or {}).get("waste_percent")
    if isinstance(waste_override, (int, float)):
        for section in sections:
            for item in section.items:
                if item.cost_type == "MATERIAL":
                    item.waste_percent = float(waste_override)

    # A stated haul distance replaces the trade's generic transport line. Adding a second one
    # would charge the same deliveries twice, which is the error this tool exists to prevent.
    haul = (parameters or {}).get("haul_distance_km")
    if isinstance(haul, (int, float)) and haul > 0:
        trips = max(1, round(quantity_base / 60))
        for section in sections:
            section.items = [item for item in section.items
                             if "transport" not in item.description.lower()]
        sections = [section for section in sections if section.items]
        sections.append(
            ScopeSection(
                name="Haulage",
                items=[ScopeItem(description=f"Transport to site, {int(haul)} km round trip",
                                 quantity=trips, unit="trip", cost_type="EQUIPMENT")],
            )
        )

    sections.append(
        ScopeSection(
            name="Preliminaries",
            items=[
                ScopeItem(description="Site setup, hoarding and security", quantity=1, unit="lot", cost_type="LABOUR"),
                ScopeItem(description="Waste removal and site cleaning", quantity=1, unit="lot", cost_type="SUBCONTRACTOR"),
            ],
        )
    )
    if "wall_area" in basis and "length" in basis and "height" in basis:
        notes.append(
            f"Wall area taken as {basis['length']} m x {basis['height']} m x 2 faces = {basis['wall_area']} m2."
        )
    if stated:
        notes.append("Quantities use the measurements you confirmed: "
                     + ", ".join(f"{key} {value}" for key, value in stated.items()) + ".")
    notes.append("Quantities are suggestions. Every rate is resolved from your price book, not by the model.")
    return project_type, basis, sections, notes


# --------------------------------------------------------------------------- endpoints
@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "version": APP_VERSION,
        "provider": "openai" if PROVIDER_KEY else "deterministic",
        "model": PROVIDER_MODEL if PROVIDER_KEY else None,
        "configured": bool(PROVIDER_KEY),
    }


@app.post("/scope", response_model=ScopeResponse)
def scope(request: ScopeRequest) -> ScopeResponse:
    started = time.perf_counter()
    project_type, basis, sections, notes = _deterministic_scope(request.prompt, request.parameters)
    provider = "deterministic"
    stated = json.dumps(request.parameters) if request.parameters else "none confirmed"

    generated = _call_provider(
        [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f"Country: {request.country}. Region: {request.region or 'unspecified'}.\n"
                f"Job description: {request.prompt}\n"
                f"Confirmed measurements, which you must use rather than assume: {stated}",
            },
        ],
        'Reply as {"project_type": string, "sections": [{"name": string, "items": '
        '[{"description": string, "quantity": number, "unit": string, "cost_type": '
        '"MATERIAL"|"LABOUR"|"EQUIPMENT"|"SUBCONTRACTOR", "waste_percent": number}]}], "notes": [string]}',
    )
    if generated and isinstance(generated.get("sections"), list):
        try:
            parsed = [
                ScopeSection(
                    name=str(section.get("name", "Scope"))[:120],
                    items=[
                        ScopeItem(
                            description=_strip_money(str(item.get("description", "")))[:200],
                            quantity=float(item.get("quantity", 0) or 0),
                            unit=str(item.get("unit", "item"))[:20],
                            cost_type=str(item.get("cost_type", "MATERIAL")).upper(),
                            waste_percent=float(item.get("waste_percent", 0) or 0),
                        )
                        for item in section.get("items", [])
                        if item.get("description")
                    ],
                )
                for section in generated["sections"]
                if section.get("items")
            ]
            if parsed:
                sections = parsed
                project_type = str(generated.get("project_type", project_type))[:80]
                notes = [str(note)[:240] for note in generated.get("notes", [])] or notes
                notes.append("Rates were not requested from the model; the platform prices every line.")
                provider = PROVIDER_MODEL
        except (TypeError, ValueError):
            pass

    return ScopeResponse(
        project_type=project_type,
        basis=basis,
        sections=sections,
        notes=notes,
        provider=provider,
        latency_ms=int((time.perf_counter() - started) * 1000),
    )


@app.post("/review", response_model=ReviewResponse)
def review(request: ReviewRequest) -> ReviewResponse:
    """Deterministic checks first — these are rules, not opinions."""
    issues: list[ReviewIssue] = []
    text = " ".join(line.description.lower() for line in request.lines)
    kinds = {line.cost_type for line in request.lines}

    if "roof" in text and not any("roof" in line.description.lower() and line.cost_type == "LABOUR"
                                 for line in request.lines):
        issues.append(ReviewIssue(id="roof-labour", severity="high",
                                  title="Roofing labour is missing",
                                  detail="Roofing materials are priced but no roofing labour line was found."))
    if not any(word in text for word in ("transport", "haul", "cartage", "trip")):
        issues.append(ReviewIssue(id="transport", severity="high",
                                  title="No transport cost has been included",
                                  detail="Deliveries arrive by the trip; nothing has been priced for haulage."))
    zero_waste = [line for line in request.lines if line.cost_type == "MATERIAL" and line.waste_percent == 0]
    if zero_waste:
        issues.append(ReviewIssue(id="waste", severity="medium",
                                  title=f"{len(zero_waste)} material lines have no waste allowance",
                                  detail="Tiles, blocks and cement normally carry 5–10% for cutting and breakage."))
    if "LABOUR" not in kinds:
        issues.append(ReviewIssue(id="labour", severity="high", title="No labour has been priced",
                                  detail="Every trade on site carries labour, even where a subcontractor supplies it."))
    if request.contingency_percent == 0:
        issues.append(ReviewIssue(id="contingency", severity="medium",
                                  title="No contingency has been applied",
                                  detail="3–5% absorbs small scope changes without eroding profit."))
    if request.gross_margin_percent is not None and request.gross_margin_percent < 12:
        issues.append(ReviewIssue(id="margin", severity="high",
                                  title=f"Gross margin is only {request.gross_margin_percent:.1f}%",
                                  detail="Check markups, overhead recovery and any discount before issuing."))
    for line in request.lines:
        if line.rate_age_days and line.rate_age_days > 60:
            issues.append(ReviewIssue(id=f"stale-{line.description[:24]}", severity="medium",
                                      title=f"{line.description} rate is {line.rate_age_days} days old",
                                      detail="Confirm the price with your supplier before this estimate is issued."))

    generated = _call_provider(
        [
            {"role": "system", "content": "You review construction estimate line items for omissions, "
                                          "measurement risk and pricing hygiene. Do not add rates, totals, "
                                          "currency amounts or margins that were not supplied."},
            {"role": "user", "content": json.dumps(
                request.model_dump() if hasattr(request, "model_dump") else request.dict()
            )},
        ],
        'Reply as {"issues": [{"id": string, "severity": "high"|"medium"|"low", '
        '"title": string, "detail": string}]}. Return only issues that are actionable and not duplicates.',
    )
    if generated and isinstance(generated.get("issues"), list):
        seen = {issue.id for issue in issues}
        for raw in generated["issues"][:8]:
            try:
                candidate = ReviewIssue(
                    id=re.sub(r"[^a-z0-9_-]+", "-", str(raw.get("id", "ai-review")).lower()).strip("-")[:80],
                    severity=str(raw.get("severity", "medium")).lower(),
                    title=_strip_money(str(raw.get("title", "")))[:140],
                    detail=_strip_money(str(raw.get("detail", "")))[:500],
                )
            except (TypeError, ValueError):
                continue
            if candidate.id and candidate.title and candidate.id not in seen:
                issues.append(candidate)
                seen.add(candidate.id)
        return ReviewResponse(issues=issues, provider=PROVIDER_MODEL)

    return ReviewResponse(issues=issues, provider="deterministic")


@app.post("/assistant", response_model=AssistantResponse)
def assistant(request: AssistantRequest) -> AssistantResponse:
    """Phrases an answer over figures the backend already calculated. It never computes money."""
    if not request.facts:
        raise HTTPException(status_code=400, detail="No tenant facts were supplied for this question.")

    headline = str(request.facts.get("headline", "Here is what your records show"))
    detail = str(request.facts.get("detail", ""))

    generated = _call_provider(
        [
            {"role": "system", "content": "You explain construction business figures in two short sentences. "
                                          "Use only the figures supplied. Never calculate or invent a number."},
            {"role": "user", "content": f"Question: {request.question}\nFigures: {json.dumps(request.facts)}"},
        ],
        'Reply as {"headline": string, "detail": string}',
    )
    if generated and generated.get("headline"):
        return AssistantResponse(headline=str(generated["headline"])[:180],
                                 detail=str(generated.get("detail", detail))[:600],
                                 provider=PROVIDER_MODEL)
    return AssistantResponse(headline=headline, detail=detail, provider="deterministic")


# --------------------------------------------------------------------------- guided questions
UNIVERSAL = [
    Question(id="region", label="Which region is the site in?", type="choice",
             help="Reference rates and haulage both vary by region.",
             options=["Greater Accra", "Ashanti", "Western", "Central", "Eastern", "Volta",
                      "Northern", "Upper East", "Upper West", "Bono", "Bono East", "Ahafo",
                      "Savannah", "North East", "Oti", "Western North"],
             required=False),
    Question(id="haul_distance_km", label="How far is site from your supplier?", unit="km",
             help="Haulage is charged by the trip and is the cost most often left out.",
             default=15, required=False),
]

TRADE_QUESTIONS: dict[str, list[Question]] = {
    "tiling": [
        Question(id="area", label="Floor area to tile", unit="m2",
                 help="Measured area before any waste allowance."),
        Question(id="tile_size", label="Tile size", type="choice",
                 options=["300x300", "400x400", "600x600", "600x1200"], default="600x600"),
        Question(id="waste_percent", label="Waste allowance", unit="%",
                 help="5% for a plain room, 10% where there are many cuts.", default=10,
                 required=False),
        Question(id="skirting_m", label="Skirting length", unit="m", required=False,
                 help="Leave blank if skirting is not in your scope."),
    ],
    "blockwork": [
        Question(id="length", label="Wall length", unit="m"),
        Question(id="height", label="Wall height", unit="m"),
        Question(id="block_size", label="Block size", type="choice",
                 options=["4 inch", "5 inch", "6 inch", "8 inch"], default="6 inch"),
        Question(id="both_faces", label="Render both faces?", type="boolean", default=True,
                 required=False),
    ],
    "painting": [
        Question(id="area", label="Area to paint", unit="m2"),
        Question(id="coats", label="Number of coats", default=2, required=False),
        Question(id="internal", label="Internal work?", type="boolean", default=True,
                 help="External work carries scaffolding and weather-resistant paint.",
                 required=False),
    ],
    "roofing": [
        Question(id="area", label="Roof area on slope", unit="m2",
                 help="Plan area divided by the cosine of the pitch, if you have not measured it."),
        Question(id="sheet_type", label="Sheet type", type="choice",
                 options=["Aluzinc", "Aluminium", "Long span", "Roofing tile"], default="Aluzinc"),
        Question(id="ceiling", label="Include ceiling?", type="boolean", default=False,
                 required=False),
    ],
}

GENERAL_QUESTIONS = [
    Question(id="area", label="Floor area", unit="m2",
             help="The single figure most of the quantities scale from."),
    Question(id="storeys", label="Number of storeys", default=1, required=False),
    Question(id="finish", label="Finish level", type="choice",
             options=["Basic", "Standard", "High"], default="Standard", required=False),
]


def _trade_for(text: str) -> str | None:
    for trade, keywords in TRADE_KEYWORDS.items():
        if any(keyword in text for keyword in keywords):
            return trade
    return None


@app.post("/questionnaire", response_model=QuestionnaireResponse)
def questionnaire(request: QuestionnaireRequest) -> QuestionnaireResponse:
    """
    The questions an estimator would be asked before this job could be priced.

    Anything already stated in the description is returned in `detected` and pre-fills its answer,
    so the estimator confirms rather than retypes.
    """
    text = request.prompt.lower()
    trade = _trade_for(text)
    detected = _numbers(text)

    asked = list(TRADE_QUESTIONS.get(trade, GENERAL_QUESTIONS))
    if trade == "blockwork" and "wall_area" in detected:
        detected["area"] = detected["wall_area"]

    for question in asked:
        if question.id in detected:
            question.default = detected[question.id]
    if request.region:
        for question in UNIVERSAL:
            if question.id == "region":
                question.default = request.region

    generated = _call_provider(
        [
            {"role": "system", "content": "You prepare a short estimator questionnaire for Ghana construction work. "
                                          "Ask only for measurements and choices needed before quantity take-off. "
                                          "Do not ask for prices, budgets, rates or margins."},
            {"role": "user", "content": f"Region: {request.region or 'unspecified'}\nJob: {request.prompt}"},
        ],
        'Reply as {"project_type": string, "detected": object, "questions": [{"id": string, '
        '"label": string, "help": string, "type": "number"|"text"|"choice"|"boolean", '
        '"unit": string|null, "options": [string], "default": any, "required": boolean}]}. '
        'Return at most 8 questions.',
    )
    if generated and isinstance(generated.get("questions"), list):
        parsed = [question for question in (_as_question(raw) for raw in generated["questions"][:8]) if question]
        if parsed:
            returned = {question.id for question in parsed}
            for question in UNIVERSAL:
                if question.id not in returned:
                    parsed.append(question)
            generated_detected = generated.get("detected", {})
            if not isinstance(generated_detected, dict):
                generated_detected = {}
            return QuestionnaireResponse(
                project_type=str(generated.get("project_type", (trade or "general").capitalize()))[:80],
                questions=parsed,
                detected={**detected, **generated_detected},
                provider=PROVIDER_MODEL,
            )

    return QuestionnaireResponse(
        project_type=(trade or "general").capitalize(),
        questions=asked + UNIVERSAL,
        detected=detected,
        provider="deterministic",
    )


# --------------------------------------------------------------------------- reading a bill
_ROW = re.compile(
    r"^\s*(?:\d+(?:\.\d+)*[).]?\s+)?"          # optional bill item number
    r"(?P<description>.+?)\s{2,}|^\s*(?P<d2>.+?)[\t,;]",
    re.UNICODE,
)
_QTY_UNIT = re.compile(
    r"(?P<qty>\d[\d,]*\.?\d*)\s*(?P<unit>m2|m²|m3|m³|mm|m|kg|no|nr|pcs|pieces|bags?|bag|"
    r"trips?|days?|hours?|hrs?|sheets?|litres?|ltr|l|sum|lot|item)\b",
    re.IGNORECASE,
)
_UNIT_WORDS = {
    "m²": "m2", "m³": "m3", "nr": "no", "pieces": "pcs", "hrs": "hour", "hours": "hour",
    "ltr": "litre", "litres": "litre", "bags": "bag", "trips": "trip", "days": "day",
    "sheets": "sheet",
}


def _classify(description: str) -> str:
    text = description.lower()
    if any(word in text for word in ("labour", "labor", "fixing", "installation", "workmanship")):
        return "LABOUR"
    if any(word in text for word in ("hire", "plant", "excavator", "mixer", "scaffold", "transport",
                                     "haulage", "crane")):
        return "EQUIPMENT"
    if any(word in text for word in ("subcontract", "sub-contract", "specialist")):
        return "SUBCONTRACTOR"
    return "MATERIAL"


@app.post("/extract", response_model=ExtractResponse)
def extract(request: ExtractRequest) -> ExtractResponse:
    """
    Reads a bill the estimator already has: pasted from a spreadsheet, a CSV, or typed out.

    Quantities and units are taken from the text. Any money on the line is discarded: rates come
    from the price book, and a figure copied out of someone else's bill is not this contractor's
    cost.
    """
    generated = _call_provider(
        [
            {"role": "system", "content": "Read construction bill lines into clean scope items. "
                                          "Extract descriptions, quantities, units and broad cost type only. "
                                          "Discard all rates, totals, markups and currency amounts."},
            {"role": "user", "content": request.content[:12000]},
        ],
        'Reply as {"sections": [{"name": string, "items": [{"description": string, '
        '"quantity": number, "unit": string, "cost_type": "MATERIAL"|"LABOUR"|"EQUIPMENT"|"SUBCONTRACTOR", '
        '"waste_percent": number}]}], "rows_read": number, "rows_skipped": number, "notes": [string]}.',
    )
    if generated and isinstance(generated.get("sections"), list):
        parsed_sections: list[ScopeSection] = []
        item_count = 0
        for raw_section in generated["sections"][:12]:
            raw_items = raw_section.get("items", []) if isinstance(raw_section, dict) else []
            items = [item for item in (_as_scope_item(raw) for raw in raw_items[:100]) if item and item.description]
            if items:
                item_count += len(items)
                parsed_sections.append(ScopeSection(
                    name=str(raw_section.get("name", "Imported bill"))[:120],
                    items=items,
                ))
        if parsed_sections:
            notes = [str(note)[:240] for note in generated.get("notes", [])] if isinstance(generated.get("notes"), list) else []
            notes.append(f"{item_count} lines read. Rates are resolved from your price book, not from the source.")
            return ExtractResponse(
                sections=parsed_sections,
                rows_read=item_count,
                rows_skipped=int(generated.get("rows_skipped", 0) or 0),
                notes=notes,
                provider=PROVIDER_MODEL,
            )

    lines = [line for line in request.content.splitlines() if line.strip()]
    items: list[ScopeItem] = []
    skipped = 0
    notes: list[str] = []

    for raw in lines:
        line = raw.replace("\t", "  ").strip()
        if not line or len(line) < 3:
            continue
        # A bill states the quantity after the description, so the last figure on the line is the
        # quantity. Taking the first would read "cement 50kg   320 bag" as 50 kg.
        matches = list(_QTY_UNIT.finditer(line))
        if not matches:
            skipped += 1
            continue
        match = matches[-1]
        description = line[: match.start()].strip(" .,;:-|\t")
        description = re.sub(r"^\d+(?:\.\d+)*[).]?\s*", "", description).strip()
        description = _strip_money(description)
        if len(description) < 3:
            skipped += 1
            continue
        try:
            quantity = float(match.group("qty").replace(",", ""))
        except ValueError:
            skipped += 1
            continue
        unit = match.group("unit").lower()
        items.append(ScopeItem(
            description=description[:200],
            quantity=quantity,
            unit=_UNIT_WORDS.get(unit, unit),
            cost_type=_classify(description),
            waste_percent=0,
        ))

    if not items:
        notes.append("No priced lines could be read. Each line needs a description followed by a "
                     "quantity and a unit, for example: Cement 50kg   120 bag.")
    else:
        notes.append(f"{len(items)} lines read. Rates are resolved from your price book, not from "
                     "any figure in the source.")
    if skipped:
        notes.append(f"{skipped} lines had no quantity and unit and were left out.")

    return ExtractResponse(
        sections=[ScopeSection(name="Imported bill", items=items)] if items else [],
        rows_read=len(items),
        rows_skipped=skipped,
        notes=notes,
        provider="deterministic",
    )
