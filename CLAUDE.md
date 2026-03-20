# LaunchPad - AI-Powered Job Search App

## Repository
- **GitHub:** github.com/redriversedge/LaunchPad
- **Branch:** main
- **Hosting:** Vercel (deploy from GitHub)

## Architecture
- **Framework:** Next.js 16 (App Router) + TypeScript + React 19
- **UI:** Tailwind CSS v4 with @theme/@utility custom classes (brand-600 blue theme), dark mode support
- **Database:** Turso (hosted SQLite) via Prisma ORM v7 + @prisma/adapter-libsql
- **Auth:** Better Auth (email/password)
- **AI:** Claude API (@anthropic-ai/sdk) for all intelligence
- **Resume Parsing:** pdf-parse (PDFs) + mammoth (DOCX) for Node.js-compatible text extraction
- **Job APIs:** Adzuna (primary), JSearch/RapidAPI (secondary), plugin architecture
- **Icons:** lucide-react + inline SVG icons in sidebar

## Environment Variables
Required in `.env.local` (see `.env.example` for template):
- `TURSO_DATABASE_URL` - Turso libsql:// connection URL
- `TURSO_AUTH_TOKEN` - Turso database auth token
- `BETTER_AUTH_SECRET` - Auth session signing secret
- `BETTER_AUTH_URL` - App URL (http://localhost:3000 for dev)
- `ANTHROPIC_API_KEY` - Claude API key
- `NEXT_PUBLIC_APP_URL` - Public app URL
- `ADZUNA_APP_ID` - Adzuna job search API app ID
- `ADZUNA_APP_KEY` - Adzuna job search API key
- `JSEARCH_RAPIDAPI_KEY` - (optional) JSearch RapidAPI key for additional job results

## Code Conventions
- Modern TypeScript (strict mode)
- Next.js App Router patterns (server components by default, "use client" only when needed)
- Tailwind v4: custom colors via @theme, custom utilities via @utility (btn-primary, card, input-field)
- Dark mode: use `dark:` variant classes on all new UI. Custom utilities use `:where(.dark, .dark *) &` for dark support.
- cn() utility for conditional classNames (lib/utils/cn.ts)
- API routes return NextResponse.json() and must include try/catch with descriptive error messages
- All AI calls go through lib/ai/client.ts (callClaude, callClaudeJSON). callClaudeJSON handles malformed responses gracefully.
- Each AI feature has a prompt file in lib/ai/prompts/ and Zod schema in lib/ai/schemas/
- No emojis in any content

## Important Technical Notes
- **React 19:** Context shorthand `<Ctx value={}>` is valid (no need for `<Ctx.Provider>`)
- **Prisma v7:** Uses adapter pattern. Export is PrismaLibSql (not PrismaLibSQL). SearchPreference model is singular (not searchPreferences)
- **Tailwind v4:** Uses @theme and @utility directives (not @layer components with @apply). Dark mode uses `@custom-variant dark (&:where(.dark, .dark *))`.
- **Resume parsing:** pdf-parse for PDFs, mammoth for DOCX. Type declarations in src/types/.
- **OneDrive:** node_modules lives at c:/temp/launchpad-build/ due to sync performance. All npm/build commands run from there. Source files stay in OneDrive.
- **Build directory:** c:/temp/launchpad-build/ mirrors source but has node_modules. Copy .env.local there after changes.
- **Dark mode:** Blocking script in layout.tsx prevents flash. ThemeProvider in src/components/theme-provider.tsx. Toggle in header + settings.

## Directory Structure
- `src/app/` - Next.js pages and API routes
- `src/app/(auth)/` - Login/register pages (public)
- `src/app/(dashboard)/` - All authenticated pages with sidebar layout
- `src/app/(dashboard)/apply/[applicationId]/` - AI Application Kit page
- `src/app/api/` - API routes
- `src/app/api/applications/[id]/kit/` - AI Application Kit generation endpoint
- `src/components/` - React components
- `src/components/theme-provider.tsx` - Dark mode context provider
- `src/lib/` - Core libraries
- `src/lib/ai/prompts/` - AI prompt templates (one per feature)
- `src/lib/ai/schemas/` - Zod schemas for AI output validation
- `src/lib/jobs/` - Job search plugin system
- `src/types/` - TypeScript type definitions (including pdf-parse.d.ts, mammoth.d.ts)
- `prisma/` - Database schema

## Key Commands
All commands run from `c:/temp/launchpad-build/`:
- `npm run dev` - Start dev server
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
- application-kit.ts: Generate full application package (cover letter, Q&A answers, step-by-step instructions)
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
4. Application Assistance: cover letter generation, AI application kit with Q&A + instructions
5. Application Tracking: kanban board, status changes, follow-up reminders, stats dashboard
6. Interview Prep: company research, STAR prep packages, mock interview chat with coaching

## Sidebar Navigation
Dashboard, Profile, Resumes, Search Jobs (exact match), Saved Jobs, Applications, Stats, Settings.
Mobile nav explicitly includes: Dashboard, Search Jobs, Saved Jobs, Applications, Profile.

## DO NOT
- Add emojis to any content
- Fabricate resume data or inflate job match scores
- Store sensitive data in localStorage (use database; theme preference is the exception)
- Use "use client" on pages that can be server components
- Skip Zod validation on AI outputs
- Commit .env.local or any file with API keys
- Overwrite user-entered application notes (append AI-generated content instead)
- Use JSON.parse without try/catch on data that came from AI or database
