"use client";

import { useEffect, useState, useCallback } from "react";
import { MessageSquare, Send, X, Quote, Trash2 } from "lucide-react";
import { Editor } from "@tiptap/react";

interface User {
  id: string;
  name: string;
  avatarUrl: string;
}

interface Comment {
  id: string;
  content: string;
  quote: string | null;
  userId: string;
  user: User;
  createdAt: string;
}

interface CommentsPanelProps {
  documentId: string;
  editor: Editor;
  activeUserId: string;
  onClose: () => void;
}

export default function CommentsPanel({
  documentId,
  editor,
  activeUserId,
  onClose
}: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchComments = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        headers: { "x-user-id": activeUserId }
      });
      if (!res.ok) throw new Error("Failed to fetch comments");
      const data = await res.json();
      setComments(data);
    } catch (err: any) {
      console.error(err);
      setError("Failed to load comments.");
    }
  }, [documentId, activeUserId]);

  useEffect(() => {
    setIsLoading(true);
    fetchComments().finally(() => {
      setIsLoading(false);
    });

    // Detect active text selection in Editor to use as Quote context!
    if (editor) {
      const { from, to, empty } = editor.state.selection;
      if (!empty) {
        try {
          const selectedText = editor.state.doc.textBetween(from, to, " ");
          if (selectedText.trim()) {
            setQuoteText(selectedText.trim());
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [documentId, fetchComments, editor]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": activeUserId
        },
        body: JSON.stringify({
          content: newComment.trim(),
          quote: quoteText || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add comment");
      }

      setComments((prev) => [...prev, data]);
      setNewComment("");
      setQuoteText(""); // clear selection context
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="sidebar" style={{ width: "360px", borderRight: "none", borderLeft: "1px solid var(--border-color)" }}>
      {/* Panel Header */}
      <div className="sidebar-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <MessageSquare size={18} style={{ color: "var(--primary)" }} />
          <h3 className="logo-text" style={{ fontSize: "1.1rem", background: "none", WebkitTextFillColor: "initial", color: "#fff" }}>
            Comments
          </h3>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {/* List of comments */}
      <div className="sidebar-content" style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "100px" }}>
        {isLoading ? (
          <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Loading comments...
          </p>
        ) : comments.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)" }}>
            <MessageSquare size={32} style={{ margin: "0 auto 12px", color: "var(--text-muted)", display: "block" }} />
            <p style={{ fontSize: "0.875rem" }}>No comments yet</p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px" }}>
              Highlight text in the editor to comment on a specific selection.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="share-row"
              style={{ display: "block", padding: "14px", backgroundColor: "rgba(255,255,255,0.015)" }}
            >
              {/* Comment Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <img
                  src={comment.user.avatarUrl}
                  alt={comment.user.name}
                  className="user-avatar"
                  style={{ width: "24px", height: "24px" }}
                />
                <div style={{ flex: 1 }}>
                  <p className="share-username" style={{ fontSize: "0.8rem", color: "#fff" }}>{comment.user.name}</p>
                  <p className="share-email" style={{ fontSize: "0.65rem" }}>
                    {new Date(comment.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Linked Quote Block */}
              {comment.quote && (
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    backgroundColor: "rgba(139, 92, 246, 0.05)",
                    borderLeft: "2px solid var(--primary)",
                    padding: "6px 10px",
                    borderRadius: "0 4px 4px 0",
                    marginBottom: "10px",
                    fontSize: "0.75rem",
                    color: "var(--text-secondary)",
                    fontStyle: "italic"
                  }}
                >
                  <Quote size={10} style={{ color: "var(--primary)", flexShrink: 0, marginTop: "2px" }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {comment.quote}
                  </span>
                </div>
              )}

              {/* Comment Content */}
              <p style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: "1.4", wordBreak: "break-word" }}>
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input panel fixed at the bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "16px",
          backgroundColor: "var(--bg-sidebar)",
          borderTop: "1px solid var(--border-color)",
          zIndex: 10
        }}
      >
        {quoteText && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backgroundColor: "rgba(139, 92, 246, 0.08)",
              padding: "6px 10px",
              borderRadius: "6px",
              marginBottom: "8px",
              fontSize: "0.7rem",
              color: "var(--text-secondary)"
            }}
          >
            <div style={{ display: "flex", gap: "4px", alignItems: "center", minWidth: 0 }}>
              <Quote size={10} style={{ color: "var(--primary)" }} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                Commenting on: "{quoteText}"
              </span>
            </div>
            <button
              onClick={() => setQuoteText("")}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex" }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <form onSubmit={handleAddComment} style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            className="form-input"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={quoteText ? "Leave a reply..." : "Add document comment..."}
            required
            style={{ fontSize: "0.8rem", padding: "8px 12px" }}
          />
          <button type="submit" className="btn-primary" style={{ padding: "8px 12px" }}>
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
