# CloudBooks Pro

**Cloud-Based Accounting & Financial Management Platform**

A comprehensive multi-tenant SaaS accounting platform designed for small-to-medium businesses (1-500 employees), comparable to QuickBooks Online Advanced.

## Architecture

- **Monorepo** structure with npm workspaces
- **Backend**: Node.js 20+ / Express.js / TypeScript
- **Frontend**: React 18+ / TypeScript / Tailwind CSS / shadcn/ui
- **Database**: PostgreSQL 16+ (schema-per-tenant multi-tenancy)
- **Cache**: Redis 7+
- **Search**: Elasticsearch 8+
- **Queue**: BullMQ with Redis
- **File Storage**: AWS S3 / MinIO

## Project Structure

```
cloudbooks-pro/
├── packages/
│   ├── shared/          # Shared types, utils, validation, constants
│   ├── backend/         # Express.js API server
│   │   ├── src/
│   │   │   ├── config/        # App configuration
│   │   │   ├── database/      # Migrations, seeds, connection
│   │   │   ├── middleware/    # Auth, RBAC, validation, tenant
│   │   │   ├── modules/      # Feature modules (auth, invoices, etc.)
│   │   │   ├── jobs/         # Background job processors
│   │   │   ├── utils/        # Backend utilities
│   │   │   └── types/        # Backend-specific types
│   │   └── tests/
│   └── frontend/        # React SPA
│       ├── src/
│       │   ├── components/   # UI components by module
│       │   ├── pages/        # Route pages
│       │   ├── store/        # Redux store & slices
│       │   ├── services/     # API client services
│       │   ├── hooks/        # Custom React hooks
│       │   └── utils/        # Frontend utilities
│       └── public/
├── docker-compose.yml
└── package.json
```

## Modules

| Module | Description |
|--------|-------------|
| Authentication | JWT, MFA, SSO, RBAC with custom roles |
| Chart of Accounts | Hierarchical COA with industry templates |
| Customers | CRM-lite with sub-customers, statements |
| Vendors | Vendor management, 1099 tracking |
| Products & Services | Inventory, services, bundles, price tiers |
| Invoicing | Create, send, track, recurring, online payments |
| Estimates | Quotes, digital acceptance, progress invoicing |
| Bills & A/P | Bill management, POs, approval workflows |
| Expenses | OCR receipt scanning, mileage, reimbursements |
| Banking | Bank feeds (Plaid), auto-matching, reconciliation |
| Journal Entries | Manual, recurring, reversing entries |
| Payroll | Employee management, pay runs, tax compliance |
| Time Tracking | Timer, timesheets, approval, billable invoicing |
| Projects | Job costing, budget tracking, profitability |
| Inventory | Multi-location, FIFO/avg cost, assemblies |
| Tax | Sales tax, VAT, UAE FTA compliance |
| Reports | 40+ reports, custom builder, scheduled delivery |
| Budgeting | Annual budgets, variance analysis |
| Multi-Currency | Auto exchange rates, gain/loss calculation |
| Audit Trail | Immutable logs, period locking, compliance |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (recommended)

### Quick Start

```bash
# Install dependencies
npm install

# Start infrastructure (PostgreSQL, Redis, Elasticsearch)
docker-compose up -d

# Run database migrations
npm run db:migrate

# Seed initial data
npm run db:seed

# Start development servers
npm run dev
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp packages/backend/.env.example packages/backend/.env
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18+, TypeScript, Tailwind CSS, shadcn/ui |
| State Management | Redux Toolkit + RTK Query |
| Backend | Node.js 20+, Express.js, TypeScript |
| Database | PostgreSQL 16+ (schema-per-tenant) |
| Cache | Redis 7+ |
| Search | Elasticsearch 8+ |
| Queue | BullMQ |
| Auth | JWT + OAuth 2.0 + SAML 2.0 |
| File Storage | AWS S3 / MinIO |
| Real-time | Socket.io |
| PDF | Puppeteer / jsPDF |
| Testing | Jest, Playwright, k6 |

## License

Proprietary - iFleet Security Surveillance Systems L.L.C S.P.C
