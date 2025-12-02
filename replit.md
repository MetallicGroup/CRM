# CRM Financiar Intern

## Overview

This is a comprehensive financial CRM application built for managing internal business operations, specifically designed for a company that deals with fences ("garduri") and roofing ("acoperișuri"). The system tracks employees, regional showrooms, distributors, and calculates complex financial metrics including commissions, costs, and profitability across multiple dimensions.

The application provides a complete dashboard with data visualization, editable tables for financial data entry, and automated calculations for profit margins, VAT, and cost distributions. All data is stored client-side using Zustand with persistence, making it a fully self-contained application that can be deployed without external database dependencies.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server, configured to serve from the `client` directory
- Wouter for lightweight client-side routing (no React Router dependency)

**State Management:**
- Zustand for global state management with persistence middleware
- All business data (employees, showrooms, distributors, monthly financial data) stored in a single Zustand store
- LocalStorage persistence via `zustand/persist` for data durability across sessions
- No backend API calls required - fully client-side data management

**UI Component System:**
- Shadcn/ui component library (New York style variant) with Radix UI primitives
- Tailwind CSS v4 with custom design tokens for consistent theming
- Custom CSS variables for colors, spacing, and border radius defined in `index.css`
- Lucide React for iconography throughout the application

**Data Visualization:**
- Recharts library for charts and graphs on the dashboard
- Bar charts for agent profitability analysis
- Pie charts for product category profit distribution

**Key Architectural Decisions:**

1. **Client-Side Data Storage**: The application uses Zustand with localStorage persistence instead of a traditional database. This was chosen to make the application completely self-contained and immediately deployable without database provisioning. All CRUD operations happen through Zustand actions.

2. **Complex Financial Calculations**: Business logic for calculating profits, costs, VAT, and cost distributions is centralized in `client/src/lib/store.ts`. The `calculateEmployeeMetrics` and `calculateDistributorMetrics` functions handle multi-step calculations including:
   - VAT calculations (21% rate)
   - Cost distribution across employees based on revenue percentages
   - Special Bucharest showroom cost allocation (20% to local agents, 80% to indirect costs)
   - Production cost distribution proportional to fence sales
   - Net profit calculations after all cost deductions

3. **Type Safety**: TypeScript interfaces in `client/src/lib/types.ts` define all data structures including `Employee`, `Distributor`, `Showroom`, and monthly financial data schemas. This ensures data consistency across the application.

4. **Modular Page Structure**: The application is divided into distinct functional pages:
   - Dashboard: Overview with charts and summary metrics
   - Angajați (Employees): Detailed employee financial data with inline editing
   - Showroom-uri (Showrooms): Regional showroom cost management
   - Distribuitori (Distributors): Distributor financial tracking
   - Settings: Employee type configuration and showroom assignments

### Backend Architecture

**Server Framework:**
- Express.js for HTTP server with minimal routing configuration
- HTTP server setup in `server/index.ts` with middleware for JSON parsing
- Custom logging middleware for request/response tracking

**Development vs Production:**
- Development mode uses Vite middleware for hot module replacement (HMR)
- Production builds serve static files from `dist/public`
- Environment-based configuration via `NODE_ENV`

**Database Schema:**
- Drizzle ORM configured for PostgreSQL with schema definition in `shared/schema.ts`
- Basic user authentication schema defined but not currently utilized
- Database credentials configured via `DATABASE_URL` environment variable
- Note: The current implementation doesn't actively use the database; all data is client-side

**Build Process:**
- Custom build script (`script/build.ts`) using esbuild for server bundling
- Vite for client-side bundling with code splitting
- Server dependencies are bundled to reduce cold start times
- Output structure: client files in `dist/public`, server in `dist/index.cjs`

### Data Model & Business Logic

**Employee Types:**
- `AGENT`: Sales agents with revenue tracking, commission calculations, and showroom assignments
- `PRODUCTIE`: Production staff with cost tracking but no direct revenue
- `INDIRECT`: Indirect/HQ staff with cost tracking but no direct revenue

**Cost Distribution Logic:**
- Bucharest showroom costs are split: 20% distributed to Bucharest-based agents, 80% to indirect costs
- Regional showroom costs are distributed proportionally to agents assigned to that showroom based on their revenue
- Production costs are distributed to all employees proportionally based on their fence sales revenue
- Indirect costs are distributed to all employees based on total revenue percentage

**Monthly Data Tracking:**
- Each employee and distributor has monthly data arrays (12 months)
- Tracked metrics include: revenue (with/without VAT), purchases, commissions, salaries, auto costs, logistics costs
- All calculations are performed on-demand when viewing data, not pre-stored

### External Dependencies

**Development Tools:**
- Replit-specific plugins for development:
  - `@replit/vite-plugin-runtime-error-modal`: Runtime error overlay
  - `@replit/vite-plugin-cartographer`: Code navigation enhancement
  - `@replit/vite-plugin-dev-banner`: Development environment banner
- Custom Vite plugin (`vite-plugin-meta-images.ts`) for managing OpenGraph meta tags with Replit deployment URLs

**Database & ORM:**
- Drizzle ORM (`drizzle-orm`) for database schema management
- Drizzle Kit for schema migrations
- Neon Serverless (`@neondatabase/serverless`) as the PostgreSQL database driver
- `drizzle-zod` for schema-to-Zod validation conversion

**UI Component Libraries:**
- Extensive Radix UI primitives for accessible components (dialogs, dropdowns, selects, etc.)
- Recharts for data visualization
- date-fns for date manipulation
- class-variance-authority (CVA) for type-safe CSS variant management
- tailwind-merge and clsx for conditional className composition

**Form Management:**
- React Hook Form with `@hookform/resolvers` for validation
- Zod for schema validation throughout the application

**Session Management (configured but unused):**
- `express-session` for session handling
- `connect-pg-simple` for PostgreSQL session store
- Session infrastructure is set up but not actively used in current implementation

**Font & Asset Management:**
- Google Fonts (Inter and JetBrains Mono) loaded via CDN
- Custom favicon support via `client/public/favicon.png`
- OpenGraph image support (`opengraph.png/jpg/jpeg`) for social media sharing

**Notable Architectural Trade-offs:**
- **Pro**: Fully self-contained application with no external API dependencies makes deployment trivial
- **Con**: No multi-user support or data synchronization; each client has independent data
- **Pro**: Type-safe calculations reduce runtime errors in complex financial logic
- **Con**: All calculations happen on-demand which could impact performance with very large datasets
- **Pro**: Zustand persistence provides immediate data durability
- **Con**: LocalStorage has size limitations that could be reached with extensive historical data