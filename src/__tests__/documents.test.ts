import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { GET as getDocs, POST as createDoc } from "@/app/api/documents/route";
import { GET as getDoc, PATCH as updateDoc, DELETE as deleteDoc } from "@/app/api/documents/[id]/route";
import { POST as shareDoc } from "@/app/api/documents/[id]/share/route";

describe("Ajaia Docs - Access Control API Integration Tests", () => {
  const ownerId = "test-owner";
  const editorId = "test-editor";
  const viewerId = "test-viewer";
  const strangerId = "test-stranger";
  let docId = "";

  beforeAll(async () => {
    // 1. Clean up test database records
    await db.share.deleteMany({
      where: {
        userId: { in: [ownerId, editorId, viewerId, strangerId] }
      }
    });
    await db.document.deleteMany({
      where: {
        ownerId: { in: [ownerId, editorId, viewerId, strangerId] }
      }
    });
    await db.user.deleteMany({
      where: {
        id: { in: [ownerId, editorId, viewerId, strangerId] }
      }
    });

    // 2. Seed test users
    await db.user.createMany({
      data: [
        { id: ownerId, name: "Owner User", email: "owner@test.com", avatarUrl: "" },
        { id: editorId, name: "Editor User", email: "editor@test.com", avatarUrl: "" },
        { id: viewerId, name: "Viewer User", email: "viewer@test.com", avatarUrl: "" },
        { id: strangerId, name: "Stranger User", email: "stranger@test.com", avatarUrl: "" }
      ]
    });
  });

  afterAll(async () => {
    // Clean up test database records and close connection
    await db.share.deleteMany({
      where: {
        userId: { in: [ownerId, editorId, viewerId, strangerId] }
      }
    });
    await db.document.deleteMany({
      where: {
        ownerId: { in: [ownerId, editorId, viewerId, strangerId] }
      }
    });
    await db.user.deleteMany({
      where: {
        id: { in: [ownerId, editorId, viewerId, strangerId] }
      }
    });
    await db.$disconnect();
  });

  it("should create a document successfully for the owner", async () => {
    const req = new NextRequest("http://localhost/api/documents", {
      method: "POST",
      headers: {
        "x-user-id": ownerId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "Test Architecture Spec",
        content: "<h1>Architecture</h1><p>Proposed design docs.</p>"
      })
    });

    const res = await createDoc(req);
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.title).toBe("Test Architecture Spec");
    expect(body.ownerId).toBe(ownerId);
    
    docId = body.id; // Store for subsequent tests
  });

  it("should block strangers from reading the document", async () => {
    const req = new NextRequest(`http://localhost/api/documents/${docId}`, {
      method: "GET",
      headers: { "x-user-id": strangerId }
    });

    const res = await getDoc(req, { params: Promise.resolve({ id: docId }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Access denied");
  });

  it("should allow owners to share the document with a viewer and an editor", async () => {
    // Share with viewer
    const req1 = new NextRequest(`http://localhost/api/documents/${docId}/share`, {
      method: "POST",
      headers: {
        "x-user-id": ownerId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        targetUserId: viewerId,
        accessLevel: "VIEW"
      })
    });
    const res1 = await shareDoc(req1, { params: Promise.resolve({ id: docId }) });
    expect(res1.status).toBe(200);

    // Share with editor
    const req2 = new NextRequest(`http://localhost/api/documents/${docId}/share`, {
      method: "POST",
      headers: {
        "x-user-id": ownerId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        targetUserId: editorId,
        accessLevel: "EDIT"
      })
    });
    const res2 = await shareDoc(req2, { params: Promise.resolve({ id: docId }) });
    expect(res2.status).toBe(200);
  });

  it("should allow a viewer to read but block them from editing", async () => {
    // 1. Read document (should succeed)
    const getReq = new NextRequest(`http://localhost/api/documents/${docId}`, {
      method: "GET",
      headers: { "x-user-id": viewerId }
    });
    const getRes = await getDoc(getReq, { params: Promise.resolve({ id: docId }) });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.role).toBe("VIEW");

    // 2. Edit document (should fail)
    const patchReq = new NextRequest(`http://localhost/api/documents/${docId}`, {
      method: "PATCH",
      headers: {
        "x-user-id": viewerId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "Malicious Edit By Viewer"
      })
    });
    const patchRes = await updateDoc(patchReq, { params: Promise.resolve({ id: docId }) });
    expect(patchRes.status).toBe(403);
    const patchBody = await patchRes.json();
    expect(patchBody.error).toBe("Read-only access");
  });

  it("should allow an editor to modify the document contents", async () => {
    const patchReq = new NextRequest(`http://localhost/api/documents/${docId}`, {
      method: "PATCH",
      headers: {
        "x-user-id": editorId,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "Updated Title by Editor",
        content: "<p>New Editor Content</p>"
      })
    });
    const patchRes = await updateDoc(patchReq, { params: Promise.resolve({ id: docId }) });
    expect(patchRes.status).toBe(200);
    
    const patchBody = await patchRes.json();
    expect(patchBody.title).toBe("Updated Title by Editor");
    expect(patchBody.content).toBe("<p>New Editor Content</p>");
  });

  it("should block editors/viewers from deleting the document", async () => {
    const req = new NextRequest(`http://localhost/api/documents/${docId}`, {
      method: "DELETE",
      headers: { "x-user-id": editorId }
    });
    const res = await deleteDoc(req, { params: Promise.resolve({ id: docId }) });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain("Only the owner can delete the document");
  });

  it("should allow the owner to delete the document", async () => {
    const req = new NextRequest(`http://localhost/api/documents/${docId}`, {
      method: "DELETE",
      headers: { "x-user-id": ownerId }
    });
    const res = await deleteDoc(req, { params: Promise.resolve({ id: docId }) });
    expect(res.status).toBe(200);

    // Verify it is gone
    const checkReq = new NextRequest(`http://localhost/api/documents/${docId}`, {
      method: "GET",
      headers: { "x-user-id": ownerId }
    });
    const checkRes = await getDoc(checkReq, { params: Promise.resolve({ id: docId }) });
    expect(checkRes.status).toBe(404);
  });
});
