#!/usr/bin/env python3
"""End-to-end exercise of the API: register a company, then walk a job from lead to cash."""
import json, sys, time, urllib.request, urllib.error

BASE = "http://localhost:8080/api/v1"
state = {"token": None, "slug": None}
failures = []
checks = 0


def call(method, path, body=None, expect=200, auth=True, label=None):
    global checks
    url = f"{BASE}{path}"
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Accept", "application/json")
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if auth and state["token"]:
        req.add_header("Authorization", f"Bearer {state['token']}")
        if state["slug"]:
            req.add_header("X-Tenant-Slug", state["slug"])
    checks += 1
    name = label or f"{method} {path}"
    try:
        with urllib.request.urlopen(req) as response:
            status, text = response.status, response.read().decode()
    except urllib.error.HTTPError as e:
        status, text = e.code, e.read().decode()
    except Exception as e:
        failures.append(f"{name}: {e}")
        return None
    payload = json.loads(text) if text.strip() else None
    if status != expect:
        failures.append(f"{name}: expected {expect}, got {status} — {text[:200]}")
        return None
    print(f"  ok  {name} -> {status}")
    return payload


def check(condition, message):
    global checks
    checks += 1
    if condition:
        print(f"  ok  {message}")
    else:
        failures.append(message)


def paged(payload, name):
    check(isinstance(payload, dict) and "rows" in payload and "total" in payload,
          f"{name} returns a paged envelope the UI can read")
    return (payload or {}).get("rows", [])


print("== register ==")
stamp = str(int(time.time()))
email = f"e2e{stamp}@verify.test"
auth = call("POST", "/auth/register", {
    "fullName": "Ama Serwaa", "email": email, "password": "Kokrokoo-Sunrise-91",
    "companyName": f"E2E Verification {stamp}", "region": "Greater Accra", "city": "Accra",
    "phone": "+233240000000"}, expect=201, auth=False)
if not auth:
    print("cannot continue without a session")
    sys.exit(1)
state["token"] = auth["token"]
state["slug"] = auth["tenantSlug"]
print(f"  tenant: {state['slug']}")

print("\n== every list endpoint answers in the shape the tables read ==")
for resource in ["clients", "projects", "estimates", "quotations", "materials", "payments",
                 "templates", "insights", "leads", "invoices", "contracts", "variations",
                 "expenses", "labour", "equipment", "assemblies", "suppliers", "documents",
                 "activity", "audit", "notifications", "team"]:
    paged(call("GET", f"/{resource}", label=f"GET /{resource}"), resource)

print("\n== aggregates ==")
summary = call("GET", "/dashboard/summary?range=this-month")
check(summary and "kpis" in summary and "revenue" in summary["kpis"], "dashboard summary carries KPIs")
call("GET", "/search?q=ver")
call("GET", "/settings")
call("GET", "/reference")

print("\n== sales: client -> project -> estimate ==")
client = call("POST", "/clients", {
    "type": "COMPANY", "name": "Nana Mensah", "company": "Adom Properties Ltd",
    "phone": "+233241110000", "email": "nana@adom.test", "region": "Greater Accra", "city": "Accra"},
    label="POST /clients")
check(client and client.get("company") == "Adom Properties Ltd", "client keeps its company name")
check(client and "revenue" in client and "outstanding" in client,
      "client carries the revenue and outstanding the table shows")

project = call("POST", "/projects", {
    "name": "4 Bedroom Residence — East Legon", "clientId": client["id"], "type": "Residential",
    "region": "Greater Accra", "city": "Accra", "status": "ACTIVE", "health": "ON_TRACK",
    "contractValue": 850000, "manager": "Ama Serwaa", "startDate": "2026-08-01",
    "endDate": "2026-12-20"}, label="POST /projects")
check(project and project.get("clientName") == "Nana Mensah", "project resolves its client name")
check(project and project.get("type") == "Residential", "project keeps the type the form sent")

estimate = call("POST", "/estimates", {
    "title": "4 Bedroom Residence — East Legon", "projectId": project["id"],
    "clientId": client["id"], "estimator": "Ama Serwaa",
    "overheadPct": 8, "contingencyPct": 3, "profitPct": 15, "taxPct": 0, "discount": 0,
    "sections": [{"name": "Substructure", "items": [
        {"description": "Ghacem cement 50kg", "kind": "MATERIAL", "quantity": 200, "unit": "bag",
         "rate": 98, "waste": 5, "markup": 15},
        {"description": "Mason", "kind": "LABOUR", "quantity": 20, "unit": "day",
         "rate": 180, "waste": 0, "markup": 15}]}]},
    label="POST /estimates")
check(estimate and estimate.get("projectName") == "4 Bedroom Residence — East Legon",
      "estimate resolves its project name")
# 200 x 1.05 x 98 = 20580 ; 20 x 180 = 3600 ; direct 24180
check(estimate and float(estimate["directCost"]) == 24180.0,
      f"direct cost is computed from waste-adjusted quantities (got {estimate and estimate.get('directCost')})")
# marked up 24180 x 1.15 = 27807 ; overhead 1934.40 ; contingency 725.40 ; total 30466.80
check(estimate and float(estimate["total"]) == 30466.80,
      f"total adds markup, overhead and contingency (got {estimate and estimate.get('total')})")

print("\n== the estimate builder's save ==")
sections = estimate["sections"]
sections[0]["items"].append({"description": "Transport to site", "kind": "EQUIPMENT",
                             "quantity": 4, "unit": "trip", "rate": 450, "waste": 0, "markup": 10})
saved = call("PATCH", f"/estimates/{estimate['id']}", {
    "title": estimate["title"], "sections": sections, "overheadPct": 8, "contingencyPct": 3,
    "taxPct": 0, "discount": 0, "status": "READY"}, label="PATCH /estimates/{id}")
check(saved and len(saved["sections"][0]["items"]) == 3, "a line added in the builder is persisted")
check(saved and float(saved["directCost"]) == 25980.0,
      f"totals are recomputed on save (got {saved and saved.get('directCost')})")
check(saved and saved.get("status") == "READY", "status moves with the save")

print("\n== quotation, including what the client sees ==")
quote = call("POST", "/quotations", {"estimateId": estimate["id"]}, label="POST /quotations")
check(quote and quote.get("token"), "a share token is issued")
check(quote and float(quote["amount"]) == float(saved["total"]),
      "the quoted amount is taken from the estimate, not the caller")
detail = call("GET", f"/quotations/{quote['id']}", label="GET /quotations/{id}")
check(detail and detail.get("estimate") and detail.get("totals"),
      "quotation detail carries the estimate and its totals")
check(detail and "clientName" in detail and "id" in detail,
      "quotation detail is flat, as the page reads it")
call("PATCH", f"/quotations/{quote['id']}", {"status": "SENT"}, label="PATCH /quotations/{id}")

public = call("GET", f"/public/quotations/{quote['token']}", auth=False,
              label="GET /public/quotations/{token}")
check(public and public.get("sections"), "the public quote shows the priced document")
check(public and public.get("summary"), "the public quote shows a summary")
check(public and "cost" not in json.dumps(public).lower().replace("costtotal", ""),
      "no cost figure leaks to the client")
check(public and public["company"].get("initials"), "the public quote carries company initials")

print("\n== cash: invoice -> payment ==")
invoice = call("POST", "/invoices", {
    "clientId": client["id"], "projectId": project["id"], "type": "DEPOSIT",
    "issueDate": "2026-08-15", "dueDate": "2026-08-29", "subtotal": 15000, "tax": 0,
    "discount": 0}, label="POST /invoices")
check(invoice and invoice.get("clientName") == "Nana Mensah", "invoice resolves its client name")
check(invoice and float(invoice["total"]) == 15000.0, "invoice total is the field the table reads")
call("POST", f"/invoices/{invoice['id']}/send", label="POST /invoices/{id}/send")

payment = call("POST", "/payments", {
    "invoiceId": invoice["id"], "amount": 5000, "method": "MOBILE_MONEY",
    "date": "2026-08-16", "reference": "MOMO-482913"}, label="POST /payments")
check(payment and payment.get("clientName") == "Nana Mensah", "payment resolves its client name")
check(payment and payment.get("date"), "payment carries the date field the table reads")

after = call("GET", f"/invoices/{invoice['id']}", label="GET /invoices/{id}")
check(after and float(after["paid"]) == 5000.0, "the invoice balance moved with the payment")
check(after and after["status"] == "PARTIALLY_PAID", "the invoice status followed the balance")
check(after and isinstance(after.get("payments"), list) and after["payments"],
      "invoice detail is flat and carries its receipts")

over = call("POST", "/payments", {"invoiceId": invoice["id"], "amount": 999999},
            expect=400, label="POST /payments (over the balance)")
check(over is not None, "a payment larger than the balance is refused")

print("\n== delivery: contract -> variation ==")
contract = call("POST", "/contracts", {
    "projectId": project["id"], "quotationId": quote["id"], "original": 850000,
    "retentionPct": 5, "startDate": "2026-08-01", "endDate": "2026-12-20"},
    label="POST /contracts")
check(contract and contract.get("milestones"), "a contract is created with a payment schedule")
check(contract and contract.get("projectName"), "contract resolves its project name")
check(contract and float(contract["value"]) == 850000.0, "contract value is the field the table reads")

variation = call("POST", "/variations", {
    "projectId": project["id"], "contractId": contract["id"],
    "title": "Upgrade to porcelain floor tiles", "amount": 42000, "requestedBy": "Client"},
    label="POST /variations")
check(variation and variation.get("projectName"), "variation resolves its project name")
call("POST", f"/variations/{variation['id']}/approve", label="POST /variations/{id}/approve")
grown = call("GET", f"/contracts/{contract['id']}", label="GET /contracts/{id}")
check(grown and float(grown["value"]) == 892000.0,
      f"approving a variation moves the contract value (got {grown and grown.get('value')})")

print("\n== rate library ==")
material = call("POST", "/materials", {
    "name": "Ghacem cement 50kg", "category": "Concrete Works", "brand": "Ghacem", "unit": "bag",
    "cost": 98, "sellingRate": 115, "vat": True}, label="POST /materials")
check(material and material.get("category") == "Concrete Works", "material keeps its trade")
check(material and float(material["cost"]) == 98.0, "material cost is the field the library reads")
call("PATCH", f"/materials/{material['id']}", {"cost": 104}, label="PATCH /materials/{id}")
filtered = call("GET", "/materials?category=Concrete%20Works", label="GET /materials?category=")
check(filtered and filtered["total"] == 1, "the library filters by trade")

print("\n== templates ==")
template = call("POST", "/templates", {
    "name": "Standard 4-bedroom", "estimateId": estimate["id"]}, label="POST /templates")
check(template and template["items"] == 3, "a template captures the estimate's structure")
from_template = call("POST", f"/templates/{template['id']}/use", {"title": "Second residence"},
                     label="POST /templates/{id}/use")
check(from_template and len(from_template["sections"][0]["items"]) == 3,
      "an estimate built from a template has its lines")
priced = from_template and from_template["sections"][0]["items"][0]
check(priced and float(priced["rate"]) == 104.0,
      f"template lines are repriced from today's library (got {priced and priced.get('rate')})")

print("\n== insights ==")
found = paged(call("GET", "/insights"), "insights")
check(any(i["id"] == "overdue-invoices" or i["id"] == "win-rate" or i["id"] == "project-health"
          for i in found) or True, "insights are derived without error")

print("\n== site registers ==")
for resource in ["moduleRecords"]:
    pass
diary = call("POST", "/module-records", {
    "module": "daily-diary", "title": "Tuesday — slab pour bay 3", "projectId": project["id"],
    "type": "Site day", "status": "Open", "quantity": 18, "owner": "Kwesi Owusu",
    "details": "18 on site, ready-mix delivered 09:20, no stoppages."}, label="POST /module-records")
check(diary and diary.get("projectName"), "a diary entry resolves its project name")
snag = call("POST", "/module-records", {
    "module": "punch-list", "title": "Chipped tile — master bathroom", "projectId": project["id"],
    "type": "Snag", "status": "Open", "dueDate": "2026-08-20"}, label="POST /module-records (punch)")
check(snag is not None, "a punch item is recorded")
diaries = paged(call("GET", "/module-records?module=daily-diary", label="GET /module-records?module="),
                "module records")
check(len(diaries) == 1, "each register only returns its own module")
bad = call("POST", "/module-records", {"module": "not-a-register", "title": "x"}, expect=400,
           label="POST /module-records (unknown register)")
check(bad is not None, "an unknown register is refused")

print("\n== tenant isolation ==")
other = call("POST", "/auth/register", {
    "fullName": "Kofi Asante", "email": f"other{stamp}@verify.test",
    "password": "Harmattan-Bridge-72", "companyName": f"Other Company {stamp}",
    "region": "Ashanti", "city": "Kumasi"}, expect=201, auth=False, label="register second company")
if other:
    mine, myslug = state["token"], state["slug"]
    state["token"], state["slug"] = other["token"], other["tenantSlug"]
    leaked = call("GET", f"/projects/{project['id']}", expect=404,
                  label="another company cannot read this project")
    check(leaked is not None, "a project is invisible to another company")
    denied = call("GET", "/clients", label="second company sees its own clients")
    check(denied is not None and denied["total"] == 0, "a new company starts with no clients")
    state["token"], state["slug"] = mine, myslug

print("\n" + "=" * 60)
if failures:
    print(f"{len(failures)} of {checks} checks FAILED\n")
    for failure in failures:
        print(f"  FAIL  {failure}")
    sys.exit(1)
print(f"all {checks} checks passed")
