"use client";

import { useEffect, useState, useCallback } from "react";
import { X, UserPlus, Trash2, Shield, Eye, Edit2, MessageSquare } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
}

interface Share {
  id: string;
  documentId: string;
  userId: string;
  accessLevel: "VIEW" | "EDIT" | "COMMENT";
  user: User;
}

interface ShareModalProps {
  documentId: string;
  documentTitle: string;
  activeUserId: string;
  onClose: () => void;
}

export default function ShareModal({
  documentId,
  documentTitle,
  activeUserId,
  onClose
}: ShareModalProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [accessLevel, setAccessLevel] = useState<"VIEW" | "EDIT" | "COMMENT">("VIEW");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchShares = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        headers: { "x-user-id": activeUserId }
      });
      if (!res.ok) throw new Error("Failed to fetch shares");
      const data = await res.json();
      setShares(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load sharing settings.");
    }
  }, [documentId, activeUserId]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setAllUsers(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load user list.");
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchShares(), fetchUsers()]).finally(() => {
      setIsLoading(false);
    });
  }, [fetchShares, fetchUsers]);

  // Handle adding share
  const handleAddShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setError("");

    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": activeUserId
        },
        body: JSON.stringify({
          targetUserId: selectedUserId,
          accessLevel
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add collaborator");
      }

      // Success - add/update in list and clear input selection
      await fetchShares();
      setSelectedUserId("");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Handle revoking share
  const handleRevokeShare = async (targetUserId: string) => {
    setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}/share?targetUserId=${targetUserId}`, {
        method: "DELETE",
        headers: { "x-user-id": activeUserId }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to revoke access");
      }

      // Refresh list
      await fetchShares();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Filter available users (excluding active user and those already shared with)
  const sharedUserIds = new Set(shares.map(s => s.userId));
  const availableUsers = allUsers.filter(
    u => u.id !== activeUserId && !sharedUserIds.has(u.id)
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div>
            <h3 className="modal-title">Share Document</h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              {documentTitle}
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: "20px 0", color: "var(--text-secondary)" }}>
            Loading settings...
          </div>
        ) : (
          <>
            {/* Share Form */}
            <form onSubmit={handleAddShare} className="form-group">
              <label className="form-label">Add Collaborator</label>
              <div className="form-input-row">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="form-input"
                  required
                >
                  <option value="">Select a user...</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
                
                <select
                  value={accessLevel}
                  onChange={(e) => setAccessLevel(e.target.value as "VIEW" | "EDIT" | "COMMENT")}
                  className="form-select"
                >
                  <option value="VIEW">Viewer</option>
                  <option value="COMMENT">Commenter</option>
                  <option value="EDIT">Editor</option>
                </select>

                <button type="submit" className="btn-primary" style={{ padding: "10px" }}>
                  <UserPlus size={18} />
                </button>
              </div>
              {error && <div className="error-message">{error}</div>}
            </form>

            {/* List of current shares */}
            <div style={{ marginTop: "24px" }}>
              <label className="form-label">People with access</label>
              <div className="shares-list">
                {shares.length === 0 ? (
                  <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", fontStyle: "italic", padding: "8px" }}>
                    Only you have access to this document.
                  </p>
                ) : (
                  shares.map((share) => (
                    <div key={share.id} className="share-row">
                      <div className="share-user-info">
                        <img
                          src={share.user.avatarUrl}
                          alt={share.user.name}
                          className="user-avatar"
                          style={{ width: "28px", height: "28px" }}
                        />
                        <div>
                          <p className="share-username">{share.user.name}</p>
                          <p className="share-email">{share.user.email}</p>
                        </div>
                      </div>
                      <div className="share-actions">
                        <div className="share-user-info" style={{ gap: "4px" }}>
                          {share.accessLevel === "EDIT" ? (
                            <>
                              <Edit2 size={12} style={{ color: "var(--badge-editor-text)" }} />
                              <span className="share-role-badge" style={{ color: "var(--badge-editor-text)" }}>Editor</span>
                            </>
                          ) : share.accessLevel === "COMMENT" ? (
                            <>
                              <MessageSquare size={12} style={{ color: "var(--primary)" }} />
                              <span className="share-role-badge" style={{ color: "var(--primary)" }}>Commenter</span>
                            </>
                          ) : (
                            <>
                              <Eye size={12} style={{ color: "var(--badge-viewer-text)" }} />
                              <span className="share-role-badge" style={{ color: "var(--badge-viewer-text)" }}>Viewer</span>
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => handleRevokeShare(share.userId)}
                          className="btn-icon-danger"
                          title="Revoke access"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
