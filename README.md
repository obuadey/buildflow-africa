# BuildFlow Africa

Multi-tenant SaaS foundation for Ghana-focused construction estimating, quotations, invoicing, and contractor business management.

## Run Locally

```bash
cp .env.example .env
docker compose up --build
```

Services:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- Swagger UI: http://localhost:8080/swagger-ui.html
- AI service: http://localhost:8000/docs
- MinIO console: http://localhost:9001

Demo data is clearly marked as development-only and must not be treated as verified market pricing.

## Repository

```text
/frontend       Next.js app
/backend        Spring Boot API
/ai-service     FastAPI AI suggestion service
/infrastructure Deployment and storage notes
/docs           Architecture, API, database, security, deployment docs
```

## Planning Artifacts

- [48-hour implementation plan](docs/48_HOUR_PLAN.md)
- [Kanban board](docs/KANBAN.md)
- [ClickUp board import guide](docs/CLICKUP_BOARD.md)
- [ClickUp task CSV](docs/clickup_import.csv)

## What Is Implemented

A job can be walked end to end: lead, client, project, estimate, quotation, contract, variation,
invoice, payment.

- Tenant-aware registration, login, refresh-token rotation and password recovery. Membership is
  re-resolved from the token on every request, so a company slug in the URL grants nothing.
- Clients, projects, estimates, quotations, contracts and variations, invoices, payments and
  expenses — each with search, filters, sorting and paging on the same query contract.
- An estimate builder whose arithmetic is defined once, in `BigDecimal`, and recomputed on the
  server on every save, so the figure on screen is the figure that is stored.
- Quotations issued from an estimate, shared over an opaque token. The client-facing document shows
  quantities and sell rates and never cost, waste allowance, markup or margin.
- A rate library of materials, labour, equipment and assemblies, priced in the company's own
  currency, plus reusable estimate templates that reprice from the library when used.
- Site registers: daily diary, punch list and accommodation.
- A dashboard, insights and search, all derived from the company's own records.
- PostgreSQL/Flyway schema, Docker Compose, and tests covering the estimate arithmetic, invoice
  status transitions and tenant isolation.

Nothing in the product displays invented figures. Where a company has no data yet, the page says so.

## Tests

```bash
cd backend && mvn test
cd frontend && npm test
```

`backend/src/test/e2e_api_walkthrough.py` walks the whole API against a running stack:

```bash
python3 backend/src/test/e2e_api_walkthrough.py
```
