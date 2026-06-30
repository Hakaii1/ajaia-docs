# Ajaia Docs

Ajaia Docs is a lightweight, responsive, and collaborative document editor inspired by Google Docs. Built using **Next.js**, **Prisma**, **SQLite**, **TipTap**, and styled with custom **Vanilla CSS**, this application demonstrates a clean, role-based sharing model, real-time auto-saving, local file import (.txt and .md), and a dark-first dashboard.

## 🚀 Getting Started

Follow these steps to run the application locally.

### Prerequisites
- Node.js (v18.0.0 or higher is recommended; tested on v22.16.0)
- npm (v10 or higher; tested on v10.9.2)

### Installation & Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Initialize the SQLite database and seed initial data:**
   This command creates a local database file `prisma/dev.db` and populates the schema.
   ```bash
   npx prisma db push
   ```

3. **Seed mock user accounts and sample documents:**
   Runs the database seeding script to configure users (Alice, Bob, Charlie) and sample shared files.
   ```bash
   node prisma/seed.js
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000) to view the application.

---

## 👥 Seeded Test Accounts

To review the role-based sharing model, you can instantly switch sessions using the **User Selector** in the sidebar. The following mock credentials are seeded:

- **Alice Vance** (`alice`) — Owner of "Ajaia Product Roadmap 2026", has edit access to Bob's onboarding guide.
- **Bob Smith** (`bob`) — Owner of "Engineering Onboarding Guide", has editor access to Alice's roadmap.
- **Charlie Brown** (`charlie`) — External collaborator, has view-only (read-only) access to Alice's roadmap.

---

## 🛠 Available Scripts

- `npm run dev` — Starts the development server at `localhost:3000`.
- `npm run build` — Builds the application for production.
- `npm run start` — Runs the compiled Next.js server.
- `npm run test` — Runs automated API and permission integration tests using **Vitest**.

---

## 🧪 Testing Access Control

We have included automated integration tests verifying our dynamic database permission logic. To run the tests:
```bash
npm run test
```
The test suite validates:
1. Document creation.
2. Stranger blocking (403 Access Denied).
3. Viewer permissions (read-only enforcement, blocking PATCH updates).
4. Editor permissions (PATCH updates successfully applied).
5. Deletion restriction (only owner can delete, editors/viewers are blocked).
