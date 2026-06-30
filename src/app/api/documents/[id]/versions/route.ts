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

    const versions = await db.version.findMany({
      where: { documentId: id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(versions);
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
    if (role !== "OWNER" && role !== "EDIT") {
      return NextResponse.json({ error: "Permission denied to create checkpoints" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { title } = body;

    const doc = await db.document.findUnique({
      where: { id }
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const version = await db.version.create({
      data: {
        documentId: id,
        title: title || `Version ${new Date().toLocaleString()}`,
        content: doc.content,
        createdById: userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            avatarUrl: true
          }
        }
      }
    });

    return NextResponse.json(version);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
