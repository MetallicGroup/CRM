# CRM Metallic Group

## Overview

This is a comprehensive CRM application built for Metallic Group, a Romanian company that deals with fences ("garduri") and roofing ("acoperișuri"). The system provides:

1. **User Authentication & Role-Based Access Control**: Multi-user system with ADMIN, AGENT, and SPECIAL roles
2. **Financial Module**: Tracks employees, regional showrooms, distributors, and calculates complex financial metrics including commissions, costs, and profitability
3. **User Management**: Full CRUD operations for managing user accounts (admin only)

The application uses PostgreSQL for data persistence with session-based authentication.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server, configured to serve from the `client` directory
- Wouter for lightweight client-side routing (no React Router dependency)

**State Management:**
- Zustand for financial module data (employees, showrooms, distributors, monthly financial data)
- React Query for server state management (authentication, users)
- AuthContext for authentication state across the application

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
   - Login: User authentication
   - Dashboard: Overview with charts and summary metrics
   - Angajați (Employees): Detailed employee financial data with inline editing (admin only)
   - Showroom-uri (Showrooms): Regional showroom cost management (admin only)
   - Distribuitori (Distributors): Distributor financial tracking (admin only)
   - Settings: Employee type configuration and showroom assignments (admin only)
   - Utilizatori (Users): User management - add, edit, activate/deactivate users (admin only)

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
- **Users table**: id, email, passwordHash, firstName, lastName, role (ADMIN/AGENT/SPECIAL), specialKey, active, sediuId, createdAt, lastLogin, lastActivity
- User sessions stored in PostgreSQL via connect-pg-simple
- Database credentials configured via `DATABASE_URL` environment variable

**Authentication System:**
- Session-based authentication with express-session
- Password hashing with bcrypt
- Role-based access control middleware (requireAuth, requireAdmin)
- Protected API routes for user management

**File Storage (Object Storage):**
- Replit Object Storage for persistent file storage
- Files are stored in cloud and persist across deployments
- Environment variable `PRIVATE_OBJECT_DIR` defines the storage bucket path
- Presigned URLs for secure uploads directly to cloud storage
- Key files:
  - `server/objectStorage.ts`: Object Storage service with upload/download functionality
  - `server/objectAcl.ts`: ACL system for file permissions
  - `client/src/components/ObjectUploader.tsx`: Reusable file upload component
- API endpoints:
  - `POST /api/files/upload-url`: Get presigned URL for file upload
  - `GET /objects/*`: Download files from storage
  - `POST /api/files/confirm-upload`: Confirm upload and update client record
- To use: Create a bucket in Replit's "App Storage" tool and set `PRIVATE_OBJECT_DIR` to `/<bucket-name>`

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

**Expense-to-Profitability Integration:**
- Expenses added via the Cheltuieli (Expenses) page are automatically reflected in agent profitability calculations
- Expense subcategory to profitability field mapping:
  - Salarii → salariu
  - Combustibil → combustibil
  - Revizii → revizii
  - Asigurări → alteCheltuieliAuto
  - Leasing → amortizareAuto
  - Rovinieta → alteCheltuieliAuto
  - Telefon → abonamente
  - Materiale birou → alteCheltuieli
  - Deplasări → diurne
  - Protocol → alteCheltuieli
  - Bugete de stat → excluded from profitability
- API endpoint: `/api/profitabilitate/agent-costs/all` aggregates expenses by agent and month
- Custom hook `useAllAgentsExpenseCosts` provides real-time expense data to the Angajati page
- Nullish coalescing (`??`) ensures zero expense values propagate correctly (not treated as falsy)

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

**Session Management:**
- `express-session` for session handling
- `connect-pg-simple` for PostgreSQL session store
- SESSION_SECRET configured as environment secret
- 24-hour session expiration

**Font & Asset Management:**
- Google Fonts (Inter and JetBrains Mono) loaded via CDN
- Custom favicon support via `client/public/favicon.png`
- OpenGraph image support (`opengraph.png/jpg/jpeg`) for social media sharing

**Notable Architectural Trade-offs:**
- **Pro**: Multi-user support with role-based access control
- **Pro**: PostgreSQL for reliable data persistence and session management
- **Pro**: Type-safe calculations reduce runtime errors in complex financial logic
- **Con**: All financial calculations happen on-demand which could impact performance with very large datasets
- **Pro**: Zustand persistence for financial data provides immediate durability
- **Con**: LocalStorage has size limitations for financial data that could be reached with extensive historical data

## User Roles

### ADMIN
- Full access to all functionality
- Can manage users (create, edit, activate/deactivate, reset passwords)
- Access to all financial data and reports
- Can configure employee types and showroom assignments

### AGENT
- Limited access (planned for CRM client management)
- Will only see their own clients
- Cannot delete data directly (only request deletion)

### SPECIAL (with specialKey)
- **MADALINA**: Can view all sold clients but limited editing
- **OANA**: Admin with toggle for "my clients" vs "all clients"
- **RALUCA**: Access to all PDF offers

## Default Admin Account
- Email: admin@metallicgroup.ro
- Password: admin123 (change after first login!)