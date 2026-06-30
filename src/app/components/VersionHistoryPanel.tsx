"use client";

import { useEffect, useState, useCallback } from "react";
import { History, Save, X, RotateCcw, AlertTriangle } from "lucide-react";

interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

interface Version {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  createdBy: User;
}

interface VersionHistoryPanelProps {
  documentId: string;
  activeUserId: string;
  canManage: boolean; // Only owners or editors can save/restore
  onClose: () => void;
  onRestore: (restoredDoc: any) => void;
}

export default function VersionHistoryPanel({
  documentId,
  activeUserId,
  canManage,
  onClose,
  onRestore
}: VersionHistoryPanelProps) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [newVersionName, setNewVersionName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        headers: { "x-user-id": activeUserId }
      });
      if (!res.ok) throw new Error("Failed to fetch versions");
      const data = await res.json();
      setVersions(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load version history.");
    }
  }, [documentId, activeUserId]);

  useEffect(() => {
    setIsLoading(true);
    fetchVersions().finally(() => {
      setIsLoading(false);
    });
  }, [documentId, fetchVersions]);

  const handleSaveVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim() || isSaving) return;

    setIsSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/documents/${documentId}/versions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": activeUserId
        },
        body: JSON.stringify({
          title: newVersionName.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save version");
      }

      setVersions((prev) => [data, ...prev]);
      setNewVersionName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRestoreVersion = async (versionId: string, versionTitle: string) => {
    if (!confirm(`Are you sure you want to restore the document to "${versionTitle}"? Current unsaved changes will be overwritten.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/documents/${documentId}/versions/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": activeUserId
        },
        body: JSON.stringify({ versionId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to restore version");
      }

      onRestore(data);
      alert("Document restored successfully!");
      onClose();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="sidebar" style={{ width: "360px", borderRight: "none", borderLeft: "1px solid var(--border-color)" }}>
      {/* Header */}
      <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <History size={18} style={{ color: "var(--primary)" }} />
          <h3 className="logo-text" style={{ fontSize: "1.1rem", background: "none", WebkitTextFillColor: "initial", color: "#fff" }}>
            Version History
          </h3>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* Manual Checkpoint Form */}
      {canManage && (
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-color)" }}>
          <form onSubmit={handleSaveVersion}>
            <label className="form-label" style={{ fontSize: "0.75rem" }}>Save Current State Checkpoint</label>
            <div className="form-input-row" style={{ marginTop: "4px" }}>
              <input
                type="text"
                className="form-input"
                value={newVersionName}
                onChange={(e) => setNewVersionName(e.target.value)}
                placeholder="Checkpoint description (e.g. Major updates)"
                required
                style={{ fontSize: "0.8rem", padding: "8px 12px" }}
              />
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: "8px 12px" }}
                disabled={isSaving}
              >
                <Save size={14} />
              </button>
            </div>
          </form>
          {error && <div className="error-message" style={{ marginTop: "8px" }}>{error}</div>}
        </div>
      )}

      {/* Version List */}
      <div className="sidebar-content" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {isLoading ? (
          <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Loading history...
          </p>
        ) : versions.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
            <History size={32} style={{ margin: "0 auto 12px", color: "var(--text-muted)", display: "block" }} />
            <p style={{ fontSize: "0.875rem" }}>No checkpoints saved yet</p>
          </div>
        ) : (
          versions.map((version) => (
            <div
              key={version.id}
              className="share-row"
              style={{ display: "block", padding: "14px", backgroundColor: "rgba(255,255,255,0.015)" }}
            >
              {/* Checkpoint Details */}
              <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "#fff", marginBottom: "6px" }}>
                {version.title}
              </p>
              
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <img
                  src={version.createdBy.avatarUrl}
                  alt={version.createdBy.name}
                  className="user-avatar"
                  style={{ width: "20px", height: "20px" }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                    {version.createdBy.name}
                  </p>
                  <p style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>
                    {new Date(version.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Restore Command */}
              {canManage && (
                <button
                  onClick={() => handleRestoreVersion(version.id, version.title)}
                  className="btn-secondary"
                  style={{ width: "100%", padding: "6px", fontSize: "0.75rem", display: "flex", justifyContent: "center", gap: "4px" }}
                >
                  <RotateCcw size={12} />
                  <span>Restore Checkpoint</span>
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
