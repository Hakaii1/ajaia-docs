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
      return NextResponse.json({ error: "Permission denied to restore document content" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { versionId } = body;

    if (!versionId) {
      return NextResponse.json({ error: "Version ID is required" }, { status: 400 });
    }

    // Retrieve version
    const version = await db.version.findFirst({
      where: { id: versionId, documentId: id }
    });

    if (!version) {
      return NextResponse.json({ error: "Version checkpoint not found" }, { status: 404 });
    }

    // Update document content
    const updatedDoc = await db.document.update({
      where: { id },
      data: {
        content: version.content
      }
    });

    return NextResponse.json({
      ...updatedDoc,
      role
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
