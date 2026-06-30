# Submission Deliverables: Ajaia Docs

This document serves as the main guide for evaluating the **Ajaia Docs** assessment submission.

---

## 🔗 Live Deployment Details
- **Live URL**: `https://ajaia-docs.onrender.com` (or [Reviewer Preferred Path])
- **Seeded Test Accounts** (Switchable instantly in the UI sidebar):
  - **Alice Vance** (`alice`) — Owner of the product roadmap document, has edit access to Bob's onboarding guide.
  - **Bob Smith** (`bob`) — Owner of the engineering onboarding guide, has editor access to Alice's roadmap.
  - **Charlie Brown** (`charlie`) — Shared with Commenter role on Alice's roadmap.

---

## 📂 Included Deliverables

This submission folder contains:
1. **Source Code**: Full-stack Next.js 16 (App Router) project in TypeScript.
2. **[README.md](file:///c:/Users/Kyle/Desktop/AJAIA/README.md)**: Local setup and running commands (npm, database seed, tests).
3. **[ARCHITECTURE.md](file:///c:/Users/Kyle/Desktop/AJAIA/ARCHITECTURE.md)**: Details on technical choices (Prisma, SQLite, TipTap, custom Vanilla CSS) and trade-offs.
4. **[AI_WORKFLOW.md](file:///c:/Users/Kyle/Desktop/AJAIA/AI_WORKFLOW.md)**: Notes explaining AI assistant utilization, velocity gains, rejected defaults, and correctness verification.
5. **[SUBMISSION.md](file:///c:/Users/Kyle/Desktop/AJAIA/SUBMISSION.md)**: This summary file.

---

## ⚙️ Features Status

### What is Working (100% Core MVP Complete)
- **Document Creation and Editing**: Create, rename, edit, and delete documents. Rich text supports Bold, Italic, Underline, Headings (H1/H2/H3), Bulleted Lists, and Numbered Lists.
- **Persistence**: Database schemas are backed by a local SQLite instance (`prisma/dev.db`) managed via Prisma. Auto-saves operate continuously in the background using a debounced handler.
- **File Upload/Import**: Local `.txt`, `.md`, or `.docx` files can be imported either as a brand-new document or inserted directly at the cursor position in an active document. Backend endpoints utilize the `mammoth` library to parse Word `.docx` documents into structured HTML block elements.
- **Role-Based Sharing**: Document owners can share files with other seeded users as **Viewer** (read-only), **Commenter** (can comment, cannot edit), or **Editor** (read-write). Sharing settings are managed through a custom modal.
- **Automated Verification**: A Vitest integration test suite validates sharing permission branches (GET/PATCH/DELETE API access control).

### What is Working (Optional Stretch Goals - ALL Built!)
- **1. Export to PDF & Markdown**: Fully functional exporter. Download clean Markdown (`.md`) files directly or trigger the native print preview (utilizing `@media print` CSS overrides that format only the A4 text canvas for clean paper/PDF layout outputs).
- **2. Contextual Commenting**: Highlights text selections to capture quotes and posts discussion comment threads to the SQLite database.
- **3. Document Version History**: Manually snapshot revisions of the document and restore the editor to any past version with a single click.
- **4. Collaboration Syncing & Live Simulation**: Periodically synchronizes cursor presence positions and remote content updates via short-polling (allowing real multi-tab editing). Includes a **"🔮 Simulate Collab"** sidebar toggle that drives simulated cursor movements and typing.
- **5. Expanded Commenter Role**: Introduced a third access level (`COMMENT`) allowing collaborators to participate in comments without editing rights.

### What is Incomplete
- None. Core requirements and all optional stretch enhancements are fully operational.

### What We Would Build Next (with 2-4 more hours)
1. **WebSockets Integration**: Replace the database short-polling sync engine with a dedicated WebSocket server (via Yjs and Hocuspocus) to support sub-second cursor updates.
2. **Nested Folders & Document Organization**: Introduce hierarchical folder layouts, tags, and search bars to organize documents in the sidebar.
3. **AI Writing Assistant**: Integrate the Gemini API to offer on-page autocomplete suggestions, summarizations, and auto-generated sections directly in the editor.
