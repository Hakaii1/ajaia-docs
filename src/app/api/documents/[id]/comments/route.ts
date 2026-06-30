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
  if (share) return share.accessLevel; // "EDIT", "VIEW", or "COMMENT"
  
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

    const comments = await db.comment.findMany({
      where: { documentId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    return NextResponse.json(comments);
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
    const { content, quote } = body;

    if (!content) {
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 });
    }

    const comment = await db.comment.create({
      data: {
        documentId: id,
        userId,
        content,
        quote: quote || null
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

    return NextResponse.json(comment);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
