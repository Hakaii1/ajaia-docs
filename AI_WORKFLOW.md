# AI-Native Workflow Note

This note details the collaboration workflow between the engineer and the AI assistant during the development of Ajaia Docs.

---

## 🛠 1. AI Tools Utilized
- **Assistant**: Gemini 3.5 Flash integrated within the Antigravity developer environment.
- **Scope**: Used for code scaffolding, layout layout styling, database schema configuration, and automated test setup.

---

## ⚡ 2. Material Velocity Gains
AI significantly accelerated work in the following areas:
- **Prisma & SQLite Setup**: Instantly generating schema models (User, Document, Share, Version, Comment, Presence) and DB seeding scripts.
- **Dynamic Next.js API Routes**: Structuring dynamic route segments and parsing async route parameters in Next.js 16.
- **CSS Styling Tokens**: Generating backdrop filters and scrollbars for a premium dark-first glassmorphic workspace layout.
- **Automated Tests**: Generating a 7-case Vitest integration suite that mocks `NextRequest` header states.

---

## 🛑 3. Rejected & Modified AI Output
We maintained strong human judgment by actively rejecting or refining AI defaults:
1. **Tailwind CSS Removal**: The initial framework bootstrap defaulted to Tailwind. We rejected this, deleted configuration files, and wrote 100% custom CSS in `globals.css` to build a premium bespoke workspace.
2. **Prisma Version Downgrade**: The AI initially installed Prisma v7.0.0, which has breaking changes for hardcoded local sqlite database connection URLs in dev mode. We downgraded Prisma to the stable v6.x series to guarantee zero-setup SQLite execution.
3. **Backend-driven Import Progression**: The AI originally suggested doing client-side `FileReader` parsing. While this worked for `.txt` and `.md`, adding support for binary Word `.docx` documents requires a compiler like `mammoth`. To avoid importing heavy node-stream shims in the browser bundle, we rejected the client-only approach and implemented a `/api/documents/import` backend endpoint.
4. **TipTap Highlight Rendering**: TipTap’s `useEditor` hook does not trigger React re-renders on selection-less transactions (like toggling Bold on a collapsed cursor). The AI code originally lagged behind until the user typed. We solved this by registering a custom `onTransaction` callback inside the editor instance to trigger React state updates, forcing instant toolbar highlights.

---

## 🔍 4. Verification & Reliability
We verified engineering quality through three feedback loops:
1. **Automated Testing**: Executed a 7-case Vitest integration suite verifying owner, editor, and stranger access restrictions. All tests pass successfully.
2. **Session Switching Validation**: Manual testing switching users in the sidebar (Alice, Bob, Charlie) confirmed that permission restrictions (e.g. read-only text, commenter block) update immediately on screen.
3. **Precise Cursor Alignment**: Tested cursor overlays under window resizes and sidebar toggles. By wrapping the canvas in a centered `816px` positioner, we confirmed that collaborator cursor coordinates align mathematically with the paragraphs they reference regardless of viewport layout shifts.
