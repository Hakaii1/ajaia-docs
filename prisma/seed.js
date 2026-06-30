const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Clean up existing data
  await prisma.presence.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.version.deleteMany({});
  await prisma.share.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.user.deleteMany({});

  // Create Users
  const alice = await prisma.user.create({
    data: {
      id: 'alice',
      name: 'Alice Vance',
      email: 'alice@ajaia.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alice',
    },
  });

  const bob = await prisma.user.create({
    data: {
      id: 'bob',
      name: 'Bob Smith',
      email: 'bob@ajaia.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Bob',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      id: 'charlie',
      name: 'Charlie Brown',
      email: 'charlie@ajaia.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Charlie',
    },
  });

  console.log('Seeded users:', [alice.id, bob.id, charlie.id]);

  // Create Sample Documents
  const doc1 = await prisma.document.create({
    data: {
      id: 'roadmap-2026',
      title: 'Ajaia Product Roadmap 2026',
      content: '<h1>Product Roadmap 2026</h1><p>Welcome to the 2026 roadmap. Here are our core milestones:</p><ul><li>Launch Ajaia Docs collaboration v1.0</li><li>Integrate AI writing assistants</li><li>Support rich attachments &amp; media</li></ul><p>Feel free to leave comments or edit the goals.</p>',
      ownerId: 'alice',
    },
  });

  const doc2 = await prisma.document.create({
    data: {
      id: 'onboarding-guide',
      title: 'Engineering Onboarding Guide',
      content: '<h1>Engineering Onboarding</h1><p>This guide will help you get set up on day one.</p><h2>1. Clone Repository</h2><p>Clone the core repository and install dependencies.</p><h2>2. Database Setup</h2><p>Run migrations and seed the local SQLite database.</p><h2>3. Environment</h2><p>Make sure you copy <code>.env.example</code> to <code>.env</code>.</p>',
      ownerId: 'bob',
    },
  });

  console.log('Seeded documents:', [doc1.id, doc2.id]);

  // Create Shares
  // Alice shares 'roadmap-2026' with Bob (as EDIT) and Charlie (as COMMENT - new commenter role)
  const share1 = await prisma.share.create({
    data: {
      documentId: 'roadmap-2026',
      userId: 'bob',
      accessLevel: 'EDIT',
    },
  });

  const share2 = await prisma.share.create({
    data: {
      documentId: 'roadmap-2026',
      userId: 'charlie',
      accessLevel: 'COMMENT', // Seeded with COMMENT role
    },
  });

  // Bob shares 'onboarding-guide' with Alice (as EDIT)
  const share3 = await prisma.share.create({
    data: {
      documentId: 'onboarding-guide',
      userId: 'alice',
      accessLevel: 'EDIT',
    },
  });

  // Seed initial version history snapshot
  const v1 = await prisma.version.create({
    data: {
      documentId: 'roadmap-2026',
      title: 'Initial Draft',
      content: '<h1>Product Roadmap 2026</h1><p>Welcome to the 2026 roadmap. Initial draft.</p>',
      createdById: 'alice',
    },
  });

  // Seed sample comments
  const comment1 = await prisma.comment.create({
    data: {
      documentId: 'roadmap-2026',
      content: 'Is this v1.0 target timeline realistic?',
      userId: 'bob',
      quote: 'Launch Ajaia Docs collaboration v1.0',
    },
  });

  const comment2 = await prisma.comment.create({
    data: {
      documentId: 'roadmap-2026',
      content: 'I can support styling this section!',
      userId: 'charlie',
      quote: 'Support rich attachments & media',
    },
  });

  console.log('Seeded version history, comments, and shares completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
