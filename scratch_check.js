const { PrismaClient } = require("@prisma/client");
const path = require("path");

const dbPath = path.resolve(process.cwd(), "prisma", "dev.db");
console.log("Checking DB path:", dbPath);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`
    }
  }
});

async function run() {
  const users = await prisma.user.findMany();
  console.log("Users:", users);
  const docs = await prisma.document.findMany();
  console.log("Documents:", docs);
  await prisma.$disconnect();
}

run().catch(console.error);
