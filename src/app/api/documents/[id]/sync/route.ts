import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

async function verifyAccess(documentId: string, userId: string) {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: {
      shares: {
        where: { userId }
      }
    }
  });

  if (!doc) return null;
  if (doc.ownerId === userId) return "OWNER";
  
  const share = doc.shares[0];
  if (share) return share.accessLevel;
  
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const role = await verifyAccess(id, userId);
    if (!role) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Clean up expired presences (older than 10 seconds)
    const expirationTime = new Date(Date.now() - 10 * 1000);
    await db.presence.deleteMany({
      where: {
        documentId: id,
        updatedAt: { lt: expirationTime }
      }
    });

    // Fetch active presences
    const presences = await db.presence.findMany({
      where: {
        documentId: id,
        userId: { not: userId } // Return other users
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });

    // Fetch latest document content (to sync dynamically if changed elsewhere!)
    const doc = await db.document.findUnique({
      where: { id },
      select: {
        content: true,
        title: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      presences,
      document: doc
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const role = await verifyAccess(id, userId);
    if (!role) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { cursorPos } = body;

    // Upsert user presence
    await db.presence.upsert({
      where: {
        documentId_userId: {
          documentId: id,
          userId
        }
      },
      update: {
        cursorPos: cursorPos ? JSON.stringify(cursorPos) : null,
        updatedAt: new Date()
      },
      create: {
        documentId: id,
        userId,
        cursorPos: cursorPos ? JSON.stringify(cursorPos) : null
      }
    });

    // Clean up expired presences (older than 10 seconds)
    const expirationTime = new Date(Date.now() - 10 * 1000);
    await db.presence.deleteMany({
      where: {
        documentId: id,
        updatedAt: { lt: expirationTime }
      }
    });

    // Fetch active presences
    const presences = await db.presence.findMany({
      where: {
        documentId: id,
        userId: { not: userId } // Return other users
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });

    // Fetch latest document content
    const doc = await db.document.findUnique({
      where: { id },
      select: {
        content: true,
        title: true,
        updatedAt: true
      }
    });

    return NextResponse.json({
      presences,
      document: doc
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
