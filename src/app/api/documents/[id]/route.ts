import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper to check user access level
async function checkAccess(documentId: string, userId: string) {
  const doc = await db.document.findUnique({
    where: { id: documentId },
    include: {
      shares: {
        where: { userId }
      }
    }
  });

  if (!doc) return { status: 404, error: "Document not found" };

  if (doc.ownerId === userId) {
    return { status: 200, role: "OWNER", document: doc };
  }

  const share = doc.shares[0];
  if (share) {
    return { status: 200, role: share.accessLevel, document: doc };
  }

  return { status: 403, error: "Access denied" };
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
    const access = await checkAccess(id, userId);
    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    return NextResponse.json({
      ...access.document,
      role: access.role
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const access = await checkAccess(id, userId);
    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Only OWNER or EDIT role can edit the document
    if (access.role !== "OWNER" && access.role !== "EDIT") {
      return NextResponse.json({ error: "Read-only access" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { title, content } = body;

    const updatedData: any = {};
    if (title !== undefined) updatedData.title = title;
    if (content !== undefined) updatedData.content = content;

    const updatedDoc = await db.document.update({
      where: { id },
      data: updatedData
    });

    return NextResponse.json({
      ...updatedDoc,
      role: access.role
    });
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
    const access = await checkAccess(id, userId);
    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Only the owner can delete the document
    if (access.role !== "OWNER") {
      return NextResponse.json({ error: "Only the owner can delete the document" }, { status: 403 });
    }

    await db.document.delete({
      where: { id }
    });

    return NextResponse.json({ message: "Document deleted successfully" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
