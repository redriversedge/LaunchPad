# LaunchPad - AI-Powered Job Search App

## Architecture
- **Framework:** Next.js 16 (App Router) + TypeScript
- **UI:** Tailwind CSS v4 with @theme/@utility custom classes (brand-600 blue theme)
- **Database:** SQLite via Prisma ORM v7 + Turso (hosted) via @prisma/adapter-libsql
- **Auth:** Better Auth (email/password)
- **AI:** Claude API (@anthropic-ai/sdk) for all intelligence
- **Resume Parsing:** officeparser v6 (PDF + DOCX text extraction)
- **Job APIs:** Adzuna (primary), JSearch/RapidAPI (secondary), plugin architecture
- **Hosting:** Vercel

## Code Conventions
- Modern TypeScript (strict mode)
- Next.js App Router patterns (server components by default, "use client" only when needed)
- Tailwind v4: custom colors via @theme, custom utilities via @utility (btn-primary, card, input-field)
- cn() utility for conditional classNames (lib/utils/cn.ts)
- API routes return NextResponse.json()
- All AI calls go through lib/ai/client.ts (callClaude, callClaudeJSON)
- Each AI feature has a prompt file in lib/ai/prompts/ and Zod schema in lib/ai/schemas/
- No emojis in any content

## Important Technical Notes
- **Prisma v7:** Uses adapter pattern. Export is PrismaLibSql (not PrismaLibSQL)
- **Tailwind v4:** Uses @theme and @utility directives (not @layer components with @apply)
- **officeparser v6:** parseOffice() returns AST object, use String() conversion
- **OneDrive:** node_modules lives at c:/temp/launchpad-build/ due to sync performance. All npm/build commands run from there. Source files in OneDrive.
- **Next.js 16 Turbopack:** Cannot handle junctions pointing outside project root

## Directory Structure
- `src/app/` - Next.js pages and API routes
- `src/app/(auth)/` - Login/register pages (public)
- `src/app/(dashboard)/` - All authenticated pages with sidebar layout
- `src/app/api/` - API routes
- `src/components/` - React components
- `src/lib/` - Core libraries
- `src/lib/ai/prompts/` - AI prompt templates (one per feature)
- `src/lib/ai/schemas/` - Zod schemas for AI output validation
- `src/lib/jobs/` - Job search plugin system
- `src/types/` - TypeScript type definitions
- `prisma/` - Database schema

## Key Commands
- `npm run dev` - Start dev server (run from c:/temp/launchpad-build/)
- `npm run build` - Production build
- `npx prisma db push` - Push schema to database
- `npx prisma studio` - Visual database browser
- `npx prisma generate` - Regenerate Prisma client

## AI Integration
All prompts in src/lib/ai/prompts/:
- resume-parser.ts: Extract structured data from resume text
- intake-questions.ts: Generate intake interview questions, adapts to industry
- job-scorer.ts: Score job fit (0-100) and hire probability with transparent breakdowns
- resume-tailor.ts: Tailor resume for specific job (never fabricate, track all changes)
- cover-letter.ts: Generate personalized cover letters
- interview-prep.ts: Create STAR answers, questions to ask, talking points
- mock-interview.ts: Run mock interviews with per-answer coaching
- company-research.ts: Compile company overview, culture, interview style

**Coaching persona:** AI acts as world-class career coach + industry expert. System prompts dynamically inject the user's industry context.

**Model:** claude-sonnet-4-20250514 (default), claude-opus-4-6 for complex tasks

## Job Search Plugin System
- Interface: JobSearchPlugin with search() method
- PluginRegistry aggregates all enabled plugins, searches in parallel, deduplicates
- Plugins: adzuna.ts, jsearch.ts
- Adding new source: create plugin file + register in plugin-registry.ts

## Build Phases (All Complete)
1. Foundation + Intake: auth, resume upload + AI parsing, intake questionnaire, profile dashboard
2. Job Discovery: job search APIs, AI scoring, search/filter/save/dismiss
3. Resume Tailoring: per-job tailoring, change tracking, side-by-side diff view
4. Application Assistance: cover letter generation, application guidance
5. Application Tracking: kanban board, status changes, follow-up reminders, stats dashboard
6. Interview Prep: company research, STAR prep packages, mock interview chat with coaching

## DO NOT
- Add emojis to any content
- Fabricate resume data or inflate job match scores
- Store sensitive data in localStorage (use database)
- Use "use client" on pages that can be server components
- Skip Zod validation on AI outputs
