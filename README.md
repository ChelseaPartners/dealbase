# DealBase

**Vision**  
DealBase turns CRE underwriting from spreadsheet craftwork into a guided, auditable valuation system — so teams can screen more deals faster, compare them consistently, and defend decisions with data.

## Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript, TailwindCSS, React Query, Zod
- **Backend**: FastAPI (Python 3.11), SQLModel (SQLite → Postgres later), Pydantic v2, Pandas/NumPy
- **Exports**: Excel (XlsxWriter now), PDF (later), JSON
- **Monorepo**: pnpm workspaces with shared TypeScript types

## Quickstart

### Prerequisites
- Node.js 18+
- Python 3.11+
- pnpm 8+

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd dealbase
   pnpm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

3. **Build shared package**
   ```bash
   pnpm --filter @dealbase/shared build
   ```

4. **Install API dependencies**
   ```bash
   cd apps/api
   pip install -r requirements.txt
   cd ../..
   ```

5. **Start development servers**
   ```bash
   pnpm dev
   ```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

### First Steps

1. **Create a Deal**: Navigate to http://localhost:3000/deals and click "New Deal"
2. **Upload Data**: Go to the deal detail page and click "Upload Data" to add T-12 and Rent Roll files
3. **Run Valuation**: Click "Run Valuation" to configure assumptions and generate KPIs
4. **Export Results**: Download Excel reports with your analysis

## Project Structure

```
dealbase/
├── apps/
│   ├── web/                 # Next.js frontend
│   │   ├── src/
│   │   │   ├── app/         # App Router pages
│   │   │   ├── components/  # React components
│   │   │   ├── lib/         # Utilities
│   │   │   └── hooks/       # Custom hooks
│   │   └── package.json
│   └── api/                 # FastAPI backend
│       ├── dealbase_api/
│       │   ├── routers/     # API endpoints
│       │   ├── models.py    # Database models
│       │   └── main.py      # FastAPI app
│       └── requirements.txt
├── packages/
│   └── shared/              # Shared TypeScript types
│       ├── src/
│       │   ├── types.ts     # TypeScript interfaces
│       │   └── schemas.ts   # Zod validation schemas
│       └── package.json
├── .github/                 # GitHub templates & CI
├── pnpm-workspace.yaml      # Monorepo config
└── package.json             # Root package.json
```

## Features

### MVP Features ✅
- **Deal Management**: Create, view, and manage commercial real estate deals
- **Data Intake**: Upload T-12 and Rent Roll data with validation and mapping
- **Valuation Engine**: Run valuations with configurable assumptions
- **KPI Dashboard**: View IRR, DSCR, Cap Rate, and other key metrics
- **Interactive Charts**: NOI trends and DSCR analysis
- **Excel Export**: Download comprehensive reports
- **Type Safety**: Full TypeScript coverage with Zod validation

### Planned Features 🚧
- **PDF Reports**: Generate investor-ready PDF documents
- **Scenario Analysis**: Run multiple valuation scenarios
- **Sensitivity Analysis**: Backtesting and stress testing
- **Governance**: Audit trails and template management
- **User Management**: Multi-user support with roles
- **Advanced Analytics**: Market comparisons and benchmarking

## Development

### Scripts

```bash
# Development
pnpm dev                    # Start all services
pnpm build                  # Build all packages
pnpm test                   # Run all tests
pnpm lint                   # Lint all packages
pnpm typecheck             # Type check all packages

# Individual services
pnpm --filter @dealbase/web dev
pnpm --filter @dealbase/api dev
```

### API Development

```bash
cd apps/api
python -m uvicorn dealbase_api.main:app --reload
```

### Frontend Development

```bash
cd apps/web
pnpm dev
```

### Testing

```bash
# Backend tests
cd apps/api
pytest

# Frontend tests
cd apps/web
pnpm test
```

## API Reference

### Core Endpoints

- `GET /api/health` - Health check
- `GET /api/deals` - List all deals
- `POST /api/deals` - Create new deal
- `GET /api/deals/{id}` - Get deal details
- `POST /api/intake/t12/{id}` - Upload T-12 data
- `POST /api/intake/rentroll/{id}` - Upload rent roll data
- `POST /api/valuation/run/{id}` - Run valuation
- `GET /api/valuation/runs/{id}` - Get valuation runs
- `GET /api/export/xlsx/{id}` - Export deal to Excel

### Data Models

See `packages/shared/src/types.ts` for complete type definitions.

## Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following our coding standards
4. **Add tests** for new functionality
5. **Commit your changes**: `git commit -m 'feat: add amazing feature'`
6. **Push to the branch**: `git push origin feature/amazing-feature`
7. **Open a Pull Request**

### Code Style

- **TypeScript**: Strict mode enabled, prefer explicit types
- **Python**: Black formatting, Ruff linting, MyPy type checking
- **Commits**: Conventional Commits format
- **Pre-commit**: Hooks installed for formatting and linting

## Roadmap

### Phase 1: MVP (Current)
- ✅ Core deal management
- ✅ Data intake and validation
- ✅ Basic valuation engine
- ✅ KPI dashboard and charts
- ✅ Excel export functionality

### Phase 2: Enhanced Analytics
- 🔄 PDF report generation
- 🔄 Scenario analysis
- 🔄 Sensitivity testing
- 🔄 Market comparisons

### Phase 3: Enterprise Features
- 🔄 Multi-user support
- 🔄 Advanced governance
- 🔄 API integrations
- 🔄 Cloud deployment

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [GitHub Wiki](https://github.com/your-org/dealbase/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-org/dealbase/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/dealbase/discussions)

---

Built with ❤️ for the commercial real estate community.
# Test commit to trigger CI
# Final CI test - all fixes applied
# Testing CI after BytesIO fix
# Testing numpy serialization fix
# Checking current test status
