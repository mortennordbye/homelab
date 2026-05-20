"""
Generate fictional Master Services Agreements for the RAG POC.

Writes one PDF per VARIANT below into ./contracts/. Files are named
contract_<slug>.pdf so the .gitignore exception
(`!contracts/contract_*.pdf`) lets them ship with the repo, while any
other PDFs/DOCX you drop into contracts/ stay local.

Each variant intentionally varies fields people are likely to ask about
across documents — parties, currency, payment terms, error-code namespace,
SLA target, jurisdiction — so the multi-doc loader has interesting things
to compare.

All amounts, codes, companies, and addresses are invented. The fixture
exists to exercise retrieval and prompt behaviour, not to model real legal
documents.

Run via:  make sample
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib import colors


# =============================================================================
# Variant spec
# =============================================================================
@dataclass(frozen=True)
class ErrorCode:
    code: str           # e.g. "ERR-1001"
    http: str           # e.g. "401"
    severity: str       # Low | Medium | High | Critical
    description: str
    response: str


@dataclass(frozen=True)
class Variant:
    slug: str                       # filename slug -> contract_<slug>.pdf
    provider_name: str
    provider_org: str
    provider_address: str
    customer_name: str
    customer_org: str
    customer_address: str
    customer_ceo: str
    provider_ceo: str
    effective_date: str             # human-readable
    currency: str                   # NOK | EUR | USD
    currency_symbol: str            # for table formatting
    net_days: int                   # NET payment window
    late_interest_pct: float        # annual late-payment interest
    reminder_fee: int               # in the same currency as fees
    availability_pct: str           # e.g. "99.9%"
    service_credit_ladder: list[tuple[str, str]] = field(default_factory=list)
    error_codes: list[ErrorCode] = field(default_factory=list)
    fees_table: list[tuple[str, str, str]] = field(default_factory=list)
    initial_term_months: int = 24
    arbitration_seat: str = "Oslo"
    governing_law_country: str = "Norway"


# =============================================================================
# The four variants. Each is internally consistent and deliberately distinct
# enough that the LLM can tell them apart in cross-document queries.
# =============================================================================

VARIANTS: list[Variant] = [
    Variant(
        slug="fjordtech",
        provider_name="Nordlys Konsult AS",
        provider_org="999 111 222",
        provider_address="Storgata 14, 0184 Oslo, Norway",
        customer_name="FjordTech Industri AS",
        customer_org="888 333 555",
        customer_address="Bryggen 9, 5003 Bergen, Norway",
        customer_ceo="Kjell Heggelund",
        provider_ceo="Astrid Lien",
        effective_date="1 March 2026",
        currency="NOK",
        currency_symbol="NOK",
        net_days=30,
        late_interest_pct=9.25,
        reminder_fee=450,
        availability_pct="99.9%",
        service_credit_ladder=[
            ("< 99.9% and >= 99.0%", "5%"),
            ("< 99.0% and >= 95.0%", "15%"),
            ("< 95.0%", "30%"),
        ],
        error_codes=[
            ErrorCode("ERR-1001", "401", "Low",
                      "Missing or invalid API key in Authorization header.",
                      "Self-service; rotate key in console."),
            ErrorCode("ERR-1002", "403", "Low",
                      "API key valid but lacks scope for requested resource.",
                      "Self-service; review IAM bindings."),
            ErrorCode("ERR-2001", "429", "Medium",
                      "Rate limit exceeded for the current API key (per-second budget).",
                      "Back off using Retry-After header; auto-resolves."),
            ErrorCode("ERR-2003", "429", "Medium",
                      "Concurrency limit exceeded for the current organisation tier.",
                      "Reduce parallelism or upgrade tier."),
            ErrorCode("ERR-3007", "503", "High",
                      "Downstream dependency timeout (storage backend).",
                      "Provider on-call paged within 15 minutes."),
            ErrorCode("ERR-4012", "500", "High",
                      "Unexpected internal error during request handling; safe to retry.",
                      "Provider on-call paged within 15 minutes."),
            ErrorCode("ERR-5001", "503", "Critical",
                      "Region-wide outage. Service unavailable in the affected region.",
                      "Incident commander engaged within 5 minutes; status page updated."),
            ErrorCode("ERR-5004", "502", "Critical",
                      "API gateway unable to reach core services. All endpoints affected.",
                      "Incident commander engaged within 5 minutes; status page updated."),
        ],
        fees_table=[
            ("Senior consultant — advisory", "per hour", "1 850"),
            ("Senior consultant — implementation", "per hour", "1 650"),
            ("Managed-platform tier 1 (development)", "per month", "42 000"),
            ("Managed-platform tier 2 (production)", "per month", "118 000"),
            ("On-call escalation outside business hours", "per incident", "6 500"),
        ],
        initial_term_months=24,
        arbitration_seat="Oslo",
        governing_law_country="Norway",
    ),

    Variant(
        slug="skyfall",
        provider_name="Nordlys Konsult AS",
        provider_org="999 111 222",
        provider_address="Storgata 14, 0184 Oslo, Norway",
        customer_name="Skyfall Logistikk AS",
        customer_org="912 444 117",
        customer_address="Bontelabo 2, 5003 Bergen, Norway",
        customer_ceo="Ingvild Solberg",
        provider_ceo="Astrid Lien",
        effective_date="15 April 2026",
        currency="EUR",
        currency_symbol="EUR",
        net_days=45,
        late_interest_pct=8.50,
        reminder_fee=75,
        availability_pct="99.5%",
        service_credit_ladder=[
            ("< 99.5% and >= 98.5%", "4%"),
            ("< 98.5% and >= 95.0%", "12%"),
            ("< 95.0%", "25%"),
        ],
        error_codes=[
            ErrorCode("SVC-100", "401", "Low",
                      "Missing bearer token on inbound request.",
                      "Self-service; reissue token via portal."),
            ErrorCode("SVC-110", "403", "Low",
                      "Token scope insufficient for requested operation.",
                      "Self-service; request scope expansion."),
            ErrorCode("SVC-220", "429", "Medium",
                      "Request rate exceeded contractual ceiling (1 000 req/min).",
                      "Back off; auto-recovers within one minute."),
            ErrorCode("SVC-301", "504", "High",
                      "Upstream warehouse-management system unreachable.",
                      "Provider on-call paged within 20 minutes."),
            ErrorCode("SVC-410", "500", "High",
                      "Shipment label generation failure (renderer crash).",
                      "Provider on-call paged within 20 minutes."),
            ErrorCode("SVC-900", "503", "Critical",
                      "Logistics orchestration plane offline across regions.",
                      "Incident commander engaged within 10 minutes."),
        ],
        fees_table=[
            ("Implementation engineer", "per hour", "175"),
            ("Solution architect", "per hour", "215"),
            ("Managed logistics API — standard", "per month", "4 800"),
            ("Managed logistics API — high-throughput", "per month", "12 500"),
            ("After-hours dispatch support", "per incident", "650"),
        ],
        initial_term_months=12,
        arbitration_seat="Bergen",
        governing_law_country="Norway",
    ),

    Variant(
        slug="polaris",
        provider_name="Nordlys Konsult AS",
        provider_org="999 111 222",
        provider_address="Storgata 14, 0184 Oslo, Norway",
        customer_name="Polaris Energi ASA",
        customer_org="976 122 884",
        customer_address="Kongens gate 87, 7012 Trondheim, Norway",
        customer_ceo="Brage Aalvik",
        provider_ceo="Astrid Lien",
        effective_date="1 February 2026",
        currency="NOK",
        currency_symbol="NOK",
        net_days=60,
        late_interest_pct=11.00,
        reminder_fee=750,
        availability_pct="99.95%",
        service_credit_ladder=[
            ("< 99.95% and >= 99.5%", "8%"),
            ("< 99.5% and >= 98.0%", "20%"),
            ("< 98.0%", "40%"),
        ],
        error_codes=[
            ErrorCode("OPS-2000", "401", "Low",
                      "Authentication failed against energy-data portal.",
                      "Self-service; rotate credentials."),
            ErrorCode("OPS-2100", "403", "Low",
                      "Caller not entitled to requested asset's telemetry stream.",
                      "Self-service; submit entitlement request."),
            ErrorCode("OPS-3050", "429", "Medium",
                      "Telemetry ingest quota exhausted for the calendar minute.",
                      "Throttle producer; auto-recovers."),
            ErrorCode("OPS-4100", "500", "High",
                      "Asset model resolver crashed parsing CIM payload.",
                      "Provider on-call paged within 10 minutes."),
            ErrorCode("OPS-4200", "502", "High",
                      "SCADA gateway returned malformed response.",
                      "Provider on-call paged within 10 minutes."),
            ErrorCode("OPS-9000", "503", "Critical",
                      "Production trading API offline. Settlement at risk.",
                      "Incident commander + executive comms within 5 minutes."),
            ErrorCode("OPS-9100", "503", "Critical",
                      "Grid-monitoring real-time stream interrupted.",
                      "Incident commander + executive comms within 5 minutes."),
        ],
        fees_table=[
            ("Principal energy-systems consultant", "per hour", "2 450"),
            ("Senior engineer", "per hour", "1 950"),
            ("Trading API — production", "per month", "285 000"),
            ("Telemetry ingest platform", "per month", "175 000"),
            ("24/7 grid-incident support", "per month", "62 000"),
        ],
        initial_term_months=36,
        arbitration_seat="Oslo",
        governing_law_country="Norway",
    ),

    Variant(
        slug="havblikk",
        provider_name="Nordlys Konsult AS",
        provider_org="999 111 222",
        provider_address="Storgata 14, 0184 Oslo, Norway",
        customer_name="Havblikk Marin AS",
        customer_org="921 008 477",
        customer_address="Storgata 51, 9008 Tromsø, Norway",
        customer_ceo="Sigrid Antonsen",
        provider_ceo="Astrid Lien",
        effective_date="20 May 2026",
        currency="USD",
        currency_symbol="USD",
        net_days=30,
        late_interest_pct=10.50,
        reminder_fee=100,
        availability_pct="99.7%",
        service_credit_ladder=[
            ("< 99.7% and >= 99.0%", "6%"),
            ("< 99.0% and >= 96.0%", "18%"),
            ("< 96.0%", "35%"),
        ],
        error_codes=[
            ErrorCode("API-A01", "401", "Low",
                      "Missing API token for vessel telemetry endpoint.",
                      "Self-service; reissue via fleet console."),
            ErrorCode("API-A02", "403", "Low",
                      "Token not scoped to requested vessel identifier.",
                      "Self-service; request scope from fleet admin."),
            ErrorCode("API-B10", "429", "Medium",
                      "Per-vessel sample rate exceeded (max 4 Hz).",
                      "Reduce reporting frequency; auto-resolves."),
            ErrorCode("API-C20", "504", "High",
                      "Satellite link latency exceeded acceptable threshold.",
                      "Provider on-call paged within 25 minutes."),
            ErrorCode("API-D30", "500", "High",
                      "Position-encoder normalization error.",
                      "Provider on-call paged within 25 minutes."),
            ErrorCode("API-Z90", "503", "Critical",
                      "Fleet-wide tracking API unreachable; safety impact possible.",
                      "Incident commander + maritime ops contact within 10 minutes."),
        ],
        fees_table=[
            ("Marine systems consultant", "per hour", "210"),
            ("Integration engineer", "per hour", "180"),
            ("Fleet telemetry API — per vessel", "per month", "320"),
            ("Aggregated analytics dashboard", "per month", "4 200"),
            ("Out-of-hours maritime support", "per incident", "780"),
        ],
        initial_term_months=24,
        arbitration_seat="Tromsø",
        governing_law_country="Norway",
    ),
]


# =============================================================================
# Rendering
# =============================================================================
def _styles():
    base = getSampleStyleSheet()
    base.add(ParagraphStyle(name="H1", parent=base["Heading1"],
                            fontSize=16, spaceAfter=12, spaceBefore=6))
    base.add(ParagraphStyle(name="H2", parent=base["Heading2"],
                            fontSize=12, spaceAfter=8, spaceBefore=14,
                            textColor=colors.HexColor("#1f3a93")))
    base.add(ParagraphStyle(name="Body", parent=base["BodyText"],
                            fontSize=10, leading=14, spaceAfter=6))
    return base


def _fmt_amount(amount: int, currency: str) -> str:
    # NOK uses thin-spaced thousands (1 850), EUR/USD use comma (4,200).
    if currency == "NOK":
        return f"{currency} {amount:,}".replace(",", " ")
    return f"{currency} {amount:,}"


def _build_story(v: Variant, s):
    story = []

    # Title
    story.append(Paragraph(f"Master Services Agreement — {v.customer_name}", s["H1"]))
    story.append(Paragraph("(Fictional sample — RAG POC fixture)", s["Body"]))
    story.append(Spacer(1, 0.4 * cm))
    story.append(Paragraph(
        f"This Master Services Agreement (the \"Agreement\") is entered into on "
        f"{v.effective_date} (the \"Effective Date\") between "
        f"<b>{v.provider_name}</b>, organisation no. {v.provider_org}, "
        f"with registered office at {v.provider_address} (the \"Provider\"), and "
        f"<b>{v.customer_name}</b>, organisation no. {v.customer_org}, "
        f"with registered office at {v.customer_address} (the \"Customer\"). "
        f"The Provider and the Customer are individually referred to as a "
        f"\"Party\" and collectively as the \"Parties\".",
        s["Body"],
    ))

    # 1. Definitions
    story.append(Paragraph("1. Definitions", s["H2"]))
    for term, defn in [
        ("\"Services\"", "the consulting, integration, and managed-platform services described in Schedule A."),
        ("\"Deliverables\"", "any reports, software artefacts, or documentation produced by the Provider under this Agreement."),
        ("\"Confidential Information\"", "any non-public information disclosed by one Party to the other and marked or reasonably understood as confidential."),
        ("\"Service Credit\"", "a monetary credit applied against future invoices as compensation for SLA breaches per Section 5."),
        ("\"Incident\"", "any unplanned interruption to or reduction in the quality of the Services."),
    ]:
        story.append(Paragraph(f"{term} means {defn}", s["Body"]))

    # 2. Scope
    story.append(Paragraph("2. Scope of Services", s["H2"]))
    story.append(Paragraph(
        "The Provider shall deliver the Services described in Schedule A in "
        "accordance with the timelines and acceptance criteria set out therein. "
        "Any change in scope shall be documented in a written change order, "
        "signed by authorised representatives of both Parties.",
        s["Body"],
    ))

    # 3. Payment Terms
    story.append(Paragraph("3. Payment Terms", s["H2"]))
    story.append(Paragraph(
        f"<b>3.1 Fees.</b> In consideration of the Services, the Customer shall "
        f"pay the Provider the fees set out in Schedule B. All fees are stated "
        f"in {v.currency} and are exclusive of value-added tax, which shall be "
        f"added at the applicable rate.", s["Body"]))
    story.append(Paragraph(
        "<b>3.2 Invoicing cadence.</b> The Provider shall invoice the Customer "
        "monthly in arrears, on or before the fifth (5th) business day of the "
        "following month.", s["Body"]))
    story.append(Paragraph(
        f"<b>3.3 Payment due date.</b> All undisputed invoices shall be paid "
        f"within <b>{v.net_days} calendar days</b> of the invoice date "
        f"(\"NET-{v.net_days}\"). Payment shall be made by electronic bank "
        f"transfer to the account designated by the Provider on the invoice.",
        s["Body"]))
    story.append(Paragraph(
        f"<b>3.4 Late payment.</b> Undisputed invoices not paid by the due date "
        f"shall accrue interest at the rate of <b>{v.late_interest_pct:.2f}% per "
        f"annum</b>, calculated daily from the day after the due date until "
        f"payment is received. The Provider may additionally charge a flat "
        f"administrative fee of <b>{_fmt_amount(v.reminder_fee, v.currency)}</b> "
        f"per reminder issued, up to a maximum of three reminders per invoice.",
        s["Body"]))
    story.append(Paragraph(
        "<b>3.5 Disputed amounts.</b> The Customer shall notify the Provider in "
        "writing of any disputed invoice amount within fifteen (15) calendar "
        "days of the invoice date. Undisputed portions shall be paid in "
        "accordance with Section 3.3.", s["Body"]))
    story.append(Paragraph(
        f"<b>3.6 Currency.</b> Fees are denominated in {v.currency}. The "
        f"Customer shall bear any bank charges or foreign-exchange spreads "
        f"associated with payments made from a non-{v.currency} account.",
        s["Body"]))

    # 4. Fee summary
    story.append(Paragraph("4. Fee Summary (extract from Schedule B)", s["H2"]))
    fee_header = ["Service line", "Unit", f"Rate ({v.currency}, ex. tax)"]
    fee_rows = [fee_header] + list(v.fees_table)
    t = Table(fee_rows, hAlign="LEFT", colWidths=[8 * cm, 3 * cm, 4.5 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eef9")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (2, 1), (2, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(t)

    story.append(PageBreak())

    # 5. SLA
    story.append(Paragraph("5. Service Level Agreement", s["H2"]))
    story.append(Paragraph(
        f"<b>5.1 Availability target.</b> The Provider shall ensure that the "
        f"production environment of the managed platform achieves at least "
        f"<b>{v.availability_pct} monthly availability</b>, measured as a "
        f"percentage of total minutes in a calendar month excluding scheduled "
        f"maintenance windows notified at least 72 hours in advance.",
        s["Body"]))
    story.append(Paragraph(
        "<b>5.2 Service Credits.</b> Where monthly availability falls below "
        "the target in 5.1, the Customer shall be entitled to Service Credits "
        "applied against the next monthly invoice, calculated as follows:",
        s["Body"]))
    credits_rows = [["Monthly availability",
                     "Service Credit (% of monthly platform fee)"]]
    credits_rows.extend([list(r) for r in v.service_credit_ladder])
    ct = Table(credits_rows, hAlign="LEFT", colWidths=[7 * cm, 8 * cm])
    ct.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eef9")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(ct)

    # 6. Error Codes
    story.append(Paragraph("6. Error Codes and Incident Response", s["H2"]))
    prefix_example = v.error_codes[0].code.split("-")[0] + "-"
    story.append(Paragraph(
        f"The managed-platform API surfaces structured error responses. The "
        f"following table enumerates the codes the Provider commits to monitor "
        f"and respond to in accordance with the response times in Section 5. "
        f"Codes are returned in the <font face='Courier'>error.code</font> JSON "
        f"field and accompanied by the indicated HTTP status. Customer "
        f"integrations should treat any code prefixed "
        f"<font face='Courier'>{prefix_example}</font> as recoverable unless "
        f"otherwise stated in the description.",
        s["Body"]))
    ec_header = ["Code", "HTTP", "Severity", "Description", "Initial response"]
    ec_rows = [ec_header]
    for ec in v.error_codes:
        ec_rows.append([ec.code, ec.http, ec.severity, ec.description, ec.response])
    et = Table(
        ec_rows, hAlign="LEFT",
        colWidths=[2 * cm, 1.3 * cm, 2 * cm, 6 * cm, 5.5 * cm],
    )
    et.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8eef9")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTNAME", (0, 1), (0, -1), "Courier"),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    story.append(et)

    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(
        "<b>6.1 Escalation.</b> Incidents resulting in any code with severity "
        "\"Critical\" shall additionally be communicated by telephone to the "
        "Customer's designated incident contact within thirty (30) minutes of "
        "detection. Codes of severity \"High\" shall be acknowledged in the "
        "Provider's ticketing system within fifteen (15) minutes.", s["Body"]))

    story.append(PageBreak())

    # 7. Confidentiality
    story.append(Paragraph("7. Confidentiality", s["H2"]))
    story.append(Paragraph(
        "Each Party shall hold the other Party's Confidential Information in "
        "strict confidence and shall not disclose it to any third party "
        "without the other Party's prior written consent, except as required "
        "by applicable law. The obligations of this Section 7 shall survive "
        "termination of this Agreement for a period of five (5) years.",
        s["Body"]))

    # 8. Data Processing
    story.append(Paragraph("8. Data Processing", s["H2"]))
    story.append(Paragraph(
        "Where the Provider processes personal data on behalf of the Customer "
        "in the course of providing the Services, the Parties shall execute a "
        "separate Data Processing Agreement (DPA) prior to the commencement "
        "of such processing. The DPA shall comply with the requirements of "
        "the EU General Data Protection Regulation 2016/679 and the Norwegian "
        "Personal Data Act.", s["Body"]))

    # 9. Term and Termination
    story.append(Paragraph("9. Term and Termination", s["H2"]))
    story.append(Paragraph(
        f"<b>9.1 Initial term.</b> This Agreement shall commence on the "
        f"Effective Date and continue for an initial term of "
        f"<b>{v.initial_term_months} months</b>, after which it shall "
        f"automatically renew for successive twelve (12)-month periods unless "
        f"either Party gives notice of non-renewal at least ninety (90) days "
        f"prior to the end of the then-current term.", s["Body"]))
    story.append(Paragraph(
        "<b>9.2 Termination for cause.</b> Either Party may terminate this "
        "Agreement with immediate effect upon written notice if the other "
        "Party (a) commits a material breach not cured within thirty (30) "
        "days of written notice; or (b) becomes insolvent, files for "
        "bankruptcy, or ceases to carry on business.", s["Body"]))

    # 10. Liability
    story.append(Paragraph("10. Limitation of Liability", s["H2"]))
    story.append(Paragraph(
        "Each Party's aggregate liability arising out of or in connection "
        "with this Agreement, whether in contract, tort, or otherwise, shall "
        "not exceed the total fees paid or payable by the Customer under "
        "this Agreement during the twelve (12) months immediately preceding "
        "the event giving rise to the claim. Neither Party shall be liable "
        "for any indirect, incidental, or consequential damages.", s["Body"]))

    # 11. Governance
    story.append(Paragraph("11. Governance and Dispute Resolution", s["H2"]))
    story.append(Paragraph(
        f"The Parties shall hold a quarterly governance meeting to review "
        f"Service performance, open incidents, and commercial matters. Any "
        f"dispute not resolved through the governance forum within thirty "
        f"(30) days shall be referred to the chief executive officers of each "
        f"Party for further negotiation. Disputes not resolved within sixty "
        f"(60) days of such referral shall be finally settled by arbitration "
        f"in <b>{v.arbitration_seat}</b> under the rules of the "
        f"{v.arbitration_seat} Chamber of Commerce.", s["Body"]))

    # 12. Governing Law
    story.append(Paragraph("12. Governing Law", s["H2"]))
    story.append(Paragraph(
        f"This Agreement shall be governed by and construed in accordance with "
        f"the laws of {v.governing_law_country}, without regard to its "
        f"conflict-of-laws provisions. The Parties consent to the exclusive "
        f"jurisdiction of the {v.governing_law_country} courts for any matter "
        f"not subject to arbitration under Section 11.", s["Body"]))

    # Signatures
    story.append(Spacer(1, 1 * cm))
    story.append(Paragraph("Signed for and on behalf of the Parties:", s["Body"]))
    story.append(Spacer(1, 0.6 * cm))
    sig = [
        [f"{v.provider_name} (Provider)", f"{v.customer_name} (Customer)"],
        ["", ""],
        ["______________________________", "______________________________"],
        [f"Name:  {v.provider_ceo}", f"Name:  {v.customer_ceo}"],
        ["Title: CEO", "Title: CEO"],
        ["Date:  ____________________", "Date:  ____________________"],
    ]
    st = Table(sig, hAlign="LEFT", colWidths=[8 * cm, 8 * cm])
    st.setStyle(TableStyle([
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(st)

    return story


OUTPUT_DIR = Path("contracts")


def build_contract(v: Variant) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_DIR / f"contract_{v.slug}.pdf"
    doc = SimpleDocTemplate(
        str(output),
        pagesize=A4,
        leftMargin=2 * cm, rightMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
        title=f"Master Services Agreement — {v.customer_name} (Sample)",
        author="local-rag-poc fixture",
    )
    doc.build(_build_story(v, _styles()))
    return output


def main() -> None:
    written = []
    for v in VARIANTS:
        path = build_contract(v)
        size = path.stat().st_size
        written.append((path, size))
        print(f"Wrote {path.resolve()} ({size:,} bytes)")

    total = sum(size for _, size in written)
    print(f"\n{len(written)} contracts generated, {total:,} bytes total.")


if __name__ == "__main__":
    main()
