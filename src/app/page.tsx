"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileText,
  Plus,
  ChevronDown,
  Share2,
  FileUp,
  FolderOpen,
  FileSignature
} from "lucide-react";
import Editor from "./components/Editor";
import ShareModal from "./components/ShareModal";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

interface Document {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  owner: {
    id: string;
    name: string;
    avatarUrl: string;
  };
  createdAt: string;
  updatedAt: string;
  role: "OWNER" | "EDIT" | "VIEW" | "COMMENT";
}

export default function Home() {
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<Document | null>(null);
  
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Collaboration and Presence states
  const [presences, setPresences] = useState<any[]>([]);
  const [simulatedPresences, setSimulatedPresences] = useState<any[]>([]);
  const [localCursor, setLocalCursor] = useState<{ top: number; left: number } | null>(null);
  const [isSimulatingCollab, setIsSimulatingCollab] = useState(false);

  // Fetch all seeded users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
      // Try to retrieve the last active user session from localStorage
      const savedUserId = typeof window !== "undefined" ? localStorage.getItem("activeUserId") : null;
      const selectedUser = data.find((u: User) => u.id === savedUserId) || data.find((u: User) => u.id === "alice") || data[0] || null;
      setActiveUser(selectedUser);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch mock users.");
    }
  }, []);

  // Fetch documents for the active user
  const fetchDocuments = useCallback(async (userId: string) => {
    try {
      const res = await fetch("/api/documents", {
        headers: { "x-user-id": userId }
      });
      if (!res.ok) throw new Error("Failed to fetch documents");
      const data = await res.json();
      setDocuments(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load documents.");
    }
  }, []);

  // Fetch users on load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fetch documents when active user changes
  useEffect(() => {
    if (activeUser) {
      fetchDocuments(activeUser.id);
      
      // If we switch users, let's close the active document or reload it
      // to verify access permissions for the new user!
      if (activeDocId) {
        reloadActiveDocument(activeDocId, activeUser.id);
      }
    }
  }, [activeUser, fetchDocuments]);

  // Synchronize presence and fetch external updates periodically
  useEffect(() => {
    if (!activeDocId || !activeUser) {
      setPresences([]);
      return;
    }

    const syncPresence = async () => {
      try {
        const res = await fetch(`/api/documents/${activeDocId}/sync`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": activeUser.id
          },
          body: JSON.stringify({ cursorPos: localCursor })
        });

        if (!res.ok) throw new Error("Sync failed");
        const data = await res.json();
        setPresences(data.presences);

        // Dynamic multi-tab content syncing:
        if (data.document && activeDoc) {
          // If content was modified elsewhere, reload document state
          if (data.document.content !== activeDoc.content) {
            setActiveDoc((prev) => prev ? { 
              ...prev, 
              content: data.document.content, 
              title: data.document.title 
            } : null);
          }
        }
      } catch (err) {
        console.error("Presence sync error:", err);
      }
    };

    syncPresence();
    const intervalId = setInterval(syncPresence, 3000);
    return () => clearInterval(intervalId);
  }, [activeDocId, activeUser, localCursor, activeDoc]);

  // Collaboration Simulator Effect
  useEffect(() => {
    if (!isSimulatingCollab || !activeDocId || !activeUser) {
      setSimulatedPresences([]);
      return;
    }

    // Select a simulated collaborator (either Bob or Alice)
    const collabUser = activeUser.id === "alice" 
      ? { id: "bob", name: "Bob Smith", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Bob" }
      : { id: "alice", name: "Alice Vance", avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alice" };

    const simulateAction = () => {
      const simulatedPos = {
        top: Math.floor(Math.random() * 300 + 150),
        left: Math.floor(Math.random() * 400 + 100)
      };

      setSimulatedPresences([
        {
          id: `sim-${collabUser.id}`,
          userId: collabUser.id,
          cursorPos: JSON.stringify(simulatedPos),
          color: collabUser.id === "bob" ? "#ec4899" : "#8b5cf6",
          user: collabUser
        }
      ]);
    };

    simulateAction();
    const intervalId = setInterval(simulateAction, 3500);
    return () => clearInterval(intervalId);
  }, [isSimulatingCollab, activeDocId, activeUser]);

  const handleRestoreDoc = (restoredDoc: any) => {
    setActiveDoc(restoredDoc);
    setDocuments((prev) =>
      prev.map((d) => (d.id === restoredDoc.id ? { ...d, title: restoredDoc.title } : d))
    );
  };

  const mergedPresences = [...presences, ...simulatedPresences];

  // Reload active document details
  const reloadActiveDocument = async (docId: string, userId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        headers: { "x-user-id": userId }
      });
      if (res.status === 403 || res.status === 404) {
        // Access denied or not found under this user - return to dashboard
        setActiveDocId(null);
        setActiveDoc(null);
        return;
      }
      if (!res.ok) throw new Error("Failed to reload document");
      const data = await res.json();
      setActiveDoc(data);
    } catch (err) {
      console.error(err);
      setActiveDocId(null);
      setActiveDoc(null);
    }
  };

  // Select a document to edit
  const handleSelectDoc = async (docId: string) => {
    if (!activeUser) return;
    setActiveDocId(docId);
    await reloadActiveDocument(docId, activeUser.id);
  };

  // Create new document
  const handleCreateDoc = async (title?: string, content?: string) => {
    if (!activeUser) return;
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": activeUser.id
        },
        body: JSON.stringify({
          title: title || "Untitled Document",
          content: content || "<h1>Untitled Document</h1><p>Start writing here...</p>"
        })
      });
      if (!res.ok) throw new Error("Failed to create document");
      const newDoc = await res.json();
      
      // Refresh documents and select the new document
      await fetchDocuments(activeUser.id);
      setActiveDocId(newDoc.id);
      setActiveDoc(newDoc);
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Save changes (called auto-saved by Editor component)
  const handleSaveDoc = async (updatedTitle: string, updatedContent: string) => {
    if (!activeUser || !activeDocId) return;
    try {
      const res = await fetch(`/api/documents/${activeDocId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": activeUser.id
        },
        body: JSON.stringify({
          title: updatedTitle,
          content: updatedContent
        })
      });
      if (!res.ok) throw new Error("Failed to save document");
      const updated = await res.json();
      
      // Update locally without refetching the whole list immediately
      setDocuments((prev) =>
        prev.map((d) => (d.id === activeDocId ? { ...d, title: updated.title } : d))
      );
      setActiveDoc(updated);
    } catch (err: any) {
      throw new Error(err.message);
    }
  };

  // Delete document
  const handleDeleteDoc = async () => {
    if (!activeUser || !activeDocId) return;
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      const res = await fetch(`/api/documents/${activeDocId}`, {
        method: "DELETE",
        headers: { "x-user-id": activeUser.id }
      });
      if (!res.ok) throw new Error("Failed to delete document");

      setActiveDocId(null);
      setActiveDoc(null);
      await fetchDocuments(activeUser.id);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Switch active user session
  const handleSwitchUser = (user: User) => {
    setActiveUser(user);
    if (typeof window !== "undefined") {
      localStorage.setItem("activeUserId", user.id);
    }
    setIsUserDropdownOpen(false);
  };

  // File import handling for new document
  const handleNewDocFromImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeUser) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/import", {
        method: "POST",
        headers: {
          "x-user-id": activeUser.id
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import file");
      }

      await handleCreateDoc(data.title, data.html);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to import file.");
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset
    }
  };

  const myDocuments = documents.filter((doc) => doc.ownerId === activeUser?.id);
  const sharedDocuments = documents.filter((doc) => doc.ownerId !== activeUser?.id);

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <div className="logo-icon">
              <FileSignature size={20} />
            </div>
            <h1 className="logo-text">Ajaia Docs</h1>
          </div>

          {/* User Mock Auth Switcher */}
          {activeUser && (
            <div className="user-selector">
              <button
                className="user-selector-trigger"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                <img
                  src={activeUser.avatarUrl}
                  alt={activeUser.name}
                  className="user-avatar"
                />
                <div className="user-info">
                  <p className="user-name">{activeUser.name}</p>
                  <p className="user-role-label">Active Session</p>
                </div>
                <ChevronDown size={14} style={{ color: "var(--text-secondary)" }} />
              </button>

              {isUserDropdownOpen && (
                <div className="user-dropdown">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className={`user-dropdown-item ${u.id === activeUser.id ? "active" : ""}`}
                      onClick={() => handleSwitchUser(u)}
                    >
                      <img
                        src={u.avatarUrl}
                        alt={u.name}
                        className="user-avatar"
                        style={{ width: "24px", height: "24px" }}
                      />
                      <div>
                        <p className="user-name" style={{ fontSize: "0.8rem" }}>{u.name}</p>
                        <p className="user-role-label" style={{ fontSize: "0.7rem" }}>{u.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Navigation */}
        <div className="sidebar-content">
          <div className="action-buttons" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button className="btn-primary" onClick={() => handleCreateDoc()}>
              <Plus size={18} />
              <span>New Document</span>
            </button>
            
            {activeDocId && (
              <button
                onClick={() => setIsSimulatingCollab(!isSimulatingCollab)}
                className={`simulation-toggle ${isSimulatingCollab ? "active" : ""}`}
                style={{ width: "100%", justifyContent: "center" }}
              >
                <span>{isSimulatingCollab ? "🔴 Stop Simulator" : "🔮 Simulate Collab"}</span>
              </button>
            )}
          </div>

          {/* My Documents Section */}
          <div className="document-section">
            <h3 className="section-title">My Documents</h3>
            <div className="document-list">
              {myDocuments.length === 0 ? (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "8px" }}>
                  No documents created yet.
                </p>
              ) : (
                myDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`document-item ${doc.id === activeDocId ? "active" : ""}`}
                    onClick={() => handleSelectDoc(doc.id)}
                  >
                    <div className="doc-info">
                      <div className="doc-icon-wrapper">
                        <FileText size={16} />
                      </div>
                      <div className="doc-meta">
                        <p className="doc-title">{doc.title}</p>
                        <p className="doc-date">
                          Updated {new Date(doc.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Shared With Me Section */}
          <div className="document-section">
            <h3 className="section-title">Shared with Me</h3>
            <div className="document-list">
              {sharedDocuments.length === 0 ? (
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", paddingLeft: "8px" }}>
                  No shared documents.
                </p>
              ) : (
                sharedDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className={`document-item ${doc.id === activeDocId ? "active" : ""}`}
                    onClick={() => handleSelectDoc(doc.id)}
                  >
                    <div className="doc-info">
                      <div className="doc-icon-wrapper">
                        <Share2 size={16} style={{ color: "var(--badge-editor-text)" }} />
                      </div>
                      <div className="doc-meta">
                        <p className="doc-title">{doc.title}</p>
                        <p className="doc-date">
                          By {doc.owner.name.split(" ")[0]}
                        </p>
                      </div>
                      <span className={`badge ${doc.role === "EDIT" ? "badge-editor" : "badge-viewer"}`}>
                        {doc.role}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="workspace">
        {activeDoc && activeUser ? (
          <Editor
            documentId={activeDoc.id}
            initialContent={activeDoc.content}
            initialTitle={activeDoc.title}
            role={activeDoc.role}
            activeUserId={activeUser.id}
            presences={mergedPresences}
            onPresenceUpdate={setLocalCursor}
            onRestore={handleRestoreDoc}
            onSave={handleSaveDoc}
            onDelete={handleDeleteDoc}
            onOpenShareModal={() => setIsShareModalOpen(true)}
          />
        ) : (
          /* Dashboard Dashboard Welcome View */
          <div className="dashboard">
            <div className="dashboard-hero">
              <h2 className="dashboard-title">Collaborate Seamlessly</h2>
              <p className="dashboard-subtitle">
                Ajaia Docs is a high-performance document hub. Create, style, and securely share your docs with role-based access.
              </p>
            </div>

            <div className="dashboard-grid">
              <div className="dashboard-card" onClick={() => handleCreateDoc()}>
                <div className="card-icon">
                  <Plus size={20} />
                </div>
                <h4 className="card-title">Create Blank</h4>
                <p className="card-description">
                  Start writing from a clean slate. Your documents auto-save in real time.
                </p>
              </div>

              <div className="dashboard-card" style={{ cursor: "default" }}>
                <div className="card-icon">
                  <Share2 size={20} />
                </div>
                <h4 className="card-title">Role-Based Sharing</h4>
                <p className="card-description">
                  Toggle active user sessions in the sidebar to test viewer vs. editor permissions.
                </p>
              </div>
            </div>

            {/* Drag & Drop Import Document Area */}
            <label className="file-import-zone">
              <FileUp size={36} className="file-import-icon" />
              <p className="file-import-text">
                {isUploading ? (
                  <span>Importing document contents...</span>
                ) : (
                  <>
                    Drag & drop or <span>browse files</span> to import
                  </>
                )}
              </p>
              <p className="file-import-constraints">
                Supports `.txt`, `.md`, and `.docx` file imports. Automatically creates editable docs.
              </p>
              <input
                type="file"
                accept=".txt,.md,.docx"
                onChange={handleNewDocFromImport}
                style={{ display: "none" }}
                disabled={isUploading}
              />
            </label>
          </div>
        )}
      </main>

      {/* Share Modal Dialog */}
      {isShareModalOpen && activeDoc && activeUser && (
        <ShareModal
          documentId={activeDoc.id}
          documentTitle={activeDoc.title}
          activeUserId={activeUser.id}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </div>
  );
}
