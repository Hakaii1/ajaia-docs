import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper to check if user is owner of the document
async function verifyOwner(documentId: string, userId: string) {
  const doc = await db.document.findUnique({
    where: { id: documentId }
  });
  if (!doc) return { error: "Document not found", status: 404 };
  if (doc.ownerId !== userId) return { error: "Only the document owner can manage shares", status: 403 };
  return { success: true };
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
    const verification = await verifyOwner(id, userId);
    if (verification.error) {
      return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    const shares = await db.share.findMany({
      where: { documentId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    return NextResponse.json(shares);
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
    const verification = await verifyOwner(id, userId);
    if (verification.error) {
      return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    const body = await req.json().catch(() => ({}));
    const { targetUserId, accessLevel } = body;

    if (!targetUserId || !["VIEW", "EDIT", "COMMENT"].includes(accessLevel)) {
      return NextResponse.json({ error: "Invalid share parameters" }, { status: 400 });
    }

    // Verify target user exists
    const targetUser = await db.user.findUnique({
      where: { id: targetUserId }
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Owner cannot share with themselves
    if (targetUserId === userId) {
      return NextResponse.json({ error: "You cannot share a document with yourself" }, { status: 400 });
    }

    // Create or update share
    const share = await db.share.upsert({
      where: {
        documentId_userId: {
          documentId: id,
          userId: targetUserId
        }
      },
      update: {
        accessLevel
      },
      create: {
        documentId: id,
        userId: targetUserId,
        accessLevel
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        }
      }
    });

    return NextResponse.json(share);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const verification = await verifyOwner(id, userId);
    if (verification.error) {
      return NextResponse.json({ error: verification.error }, { status: verification.status });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("targetUserId");

    if (!targetUserId) {
      return NextResponse.json({ error: "Missing targetUserId parameter" }, { status: 400 });
    }

    await db.share.delete({
      where: {
        documentId_userId: {
          documentId: id,
          userId: targetUserId
        }
      }
    });

    return NextResponse.json({ message: "Share revoked successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
