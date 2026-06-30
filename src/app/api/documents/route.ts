import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find documents owned by the user OR where a share exists for this user
    const documents = await db.document.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { shares: { some: { userId } } }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        },
        shares: {
          where: { userId },
          select: {
            accessLevel: true
          }
        }
      },
      orderBy: { updatedAt: "desc" }
    });

    // Format the documents to include access info for the client
    const formattedDocs = documents.map((doc) => {
      const isOwner = doc.ownerId === userId;
      const share = doc.shares[0];
      const role = isOwner ? "OWNER" : share ? share.accessLevel : "NONE";
      return {
        id: doc.id,
        title: doc.title,
        content: doc.content,
        ownerId: doc.ownerId,
        owner: doc.owner,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        role // "OWNER", "EDIT", or "VIEW"
      };
    });

    return NextResponse.json(formattedDocs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { title, content } = body;

    const doc = await db.document.create({
      data: {
        title: title || "Untitled Document",
        content: content || "<h1>Untitled Document</h1><p>Start writing here...</p>",
        ownerId: userId
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });

    return NextResponse.json({ ...doc, role: "OWNER" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
