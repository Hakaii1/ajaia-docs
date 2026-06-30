"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Heading1 as H1Icon,
  Heading2 as H2Icon,
  Heading3 as H3Icon,
  List as BulletListIcon,
  ListOrdered as OrderedListIcon,
  CloudCheck,
  CloudLightning,
  Loader2,
  Share2,
  Trash2,
  FileUp,
  MessageSquare,
  History
} from "lucide-react";
import ExportMenu from "./ExportMenu";
import CommentsPanel from "./CommentsPanel";
import VersionHistoryPanel from "./VersionHistoryPanel";

interface EditorProps {
  documentId: string;
  initialContent: string;
  initialTitle: string;
  role: "OWNER" | "EDIT" | "VIEW" | "COMMENT";
  activeUserId: string;
  presences: any[];
  onSave: (title: string, content: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onOpenShareModal: () => void;
  onPresenceUpdate?: (cursor: { top: number; left: number }) => void;
  onRestore: (restoredDoc: any) => void;
}

export default function Editor({
  documentId,
  initialContent,
  initialTitle,
  role,
  activeUserId,
  presences,
  onSave,
  onDelete,
  onOpenShareModal,
  onPresenceUpdate,
  onRestore
}: EditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">("saved");
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isVersionsOpen, setIsVersionsOpen] = useState(false);
  const [, setUpdater] = useState(0);
  const isReadOnly = role === "VIEW" || role === "COMMENT";

  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  const onPresenceUpdateRef = useRef(onPresenceUpdate);
  useEffect(() => {
    onPresenceUpdateRef.current = onPresenceUpdate;
  }, [onPresenceUpdate]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline
    ],
    content: initialContent,
    editable: !isReadOnly,
    editorProps: {
      attributes: {
        class: `editor-canvas ${isReadOnly ? "read-only" : ""}`
      }
    },
    onTransaction: () => {
      setUpdater((prev) => prev + 1);
      
      // Compute cursor coordinates relative to editor canvas and report to parent
      if (editor && !editor.isDestroyed && !isReadOnly && onPresenceUpdateRef.current) {
        try {
          const { selection } = editor.state;
          const { view } = editor;
          const coords = view.coordsAtPos(selection.from);
          const domNode = view.dom;
          const rect = domNode.getBoundingClientRect();
          const top = coords.top - rect.top;
          const left = coords.left - rect.left;
          if (typeof top === "number" && typeof left === "number" && !isNaN(top) && !isNaN(left)) {
            onPresenceUpdateRef.current({ top, left });
          }
        } catch (e) {
          // Coords lookup can sometimes fail if editor is out of focus
        }
      }
    }
  }, [documentId]);

  // Synchronize title and read-only state when documentId changes
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      const currentHTML = editor.getHTML();
      if (currentHTML !== initialContent) {
        editor.commands.setContent(initialContent);
      }
      editor.setEditable(!isReadOnly);
    }
    setTitle(initialTitle);
    setSaveStatus("saved");
  }, [documentId, initialContent, initialTitle, isReadOnly, editor]);

  // Debounced auto-save handler
  const triggerSave = useCallback((updatedTitle: string, updatedContent: string) => {
    setSaveStatus("saving");
    const timeoutId = setTimeout(async () => {
      try {
        await onSaveRef.current(updatedTitle, updatedContent);
        setSaveStatus("saved");
      } catch (err) {
        console.error("Auto-save failed", err);
        setSaveStatus("error");
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Watch for editor changes
  useEffect(() => {
    if (!editor || editor.isDestroyed || isReadOnly) return;

    const handleUpdate = () => {
      if (editor.isDestroyed) return;
      const updatedContent = editor.getHTML();
      cleanupSaveRef.current?.();
      cleanupSaveRef.current = triggerSave(title, updatedContent);
    };

    editor.on("update", handleUpdate);
    return () => {
      if (!editor.isDestroyed) {
        editor.off("update", handleUpdate);
      }
    };
  }, [editor, title, isReadOnly, triggerSave]);

  // Ref to hold cleanup function of active save timeout
  const cleanupSaveRef = useRef<(() => void) | null>(null);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      cleanupSaveRef.current?.();
    };
  }, []);

  // Handle title changes
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (isReadOnly) return;
    
    const currentContent = editor && !editor.isDestroyed ? editor.getHTML() : initialContent;
    cleanupSaveRef.current?.();
    cleanupSaveRef.current = triggerSave(newTitle, currentContent);
  };

  // Handle local file import (txt, md, docx) at cursor
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setSaveStatus("saving");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/import", {
        method: "POST",
        headers: {
          "x-user-id": activeUserId
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import file");
      }

      if (editor && !editor.isDestroyed) {
        editor.commands.insertContent(data.html);
      }
      setSaveStatus("saved");
    } catch (err: any) {
      console.error(err);
      setSaveStatus("error");
      alert(err.message || "Failed to import file.");
    } finally {
      e.target.value = ""; // Reset
    }
  };

  const handleRestore = (restoredDoc: any) => {
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(restoredDoc.content);
    }
    setTitle(restoredDoc.title);
    onRestore(restoredDoc);
  };

  if (!editor) return null;

  return (
    <div className="editor-container">
      {/* Editor Header */}
      <div className="workspace-header">
        <div className="doc-title-editor-wrapper">
          <input
            type="text"
            className="editor-title-input"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={isReadOnly}
            placeholder="Untitled Document"
          />

          {/* Saving Status Pill */}
          <div className={`editor-status-pill ${saveStatus === "saving" ? "saving" : ""}`}>
            {saveStatus === "saving" && (
              <>
                <Loader2 size={12} className="animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CloudCheck size={12} style={{ color: "var(--badge-viewer-text)" }} />
                <span>Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <>
                <CloudLightning size={12} style={{ color: "#ef4444" }} />
                <span>Error saving</span>
              </>
            )}
          </div>
        </div>

        {/* Action/Collaboration Buttons */}
        <div className="workspace-actions">
          {/* Active Collaborators list */}
          {presences && presences.length > 0 && (
            <div className="presence-list">
              {presences.map((p) => (
                <div key={p.id} className="presence-avatar-wrapper" title={`${p.user?.name || "User"} is online`}>
                  <img
                    src={p.user?.avatarUrl}
                    alt={p.user?.name}
                    className="presence-avatar-collator"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Comments Panel Toggle */}
          <button
            onClick={() => {
              setIsCommentsOpen(!isCommentsOpen);
              setIsVersionsOpen(false); // close other panel
            }}
            className={`btn-secondary ${isCommentsOpen ? "active" : ""}`}
            title="View document comments"
          >
            <MessageSquare size={16} />
            <span>Comments</span>
          </button>

          {/* Version History Toggle */}
          <button
            onClick={() => {
              setIsVersionsOpen(!isVersionsOpen);
              setIsCommentsOpen(false); // close other panel
            }}
            className={`btn-secondary ${isVersionsOpen ? "active" : ""}`}
            title="View version history"
          >
            <History size={16} />
            <span>History</span>
          </button>

          {/* Export Dropdown Menu */}
          {editor && <ExportMenu editor={editor} documentTitle={title} />}

          {role === "OWNER" && (
            <button
              onClick={onOpenShareModal}
              className="btn-secondary"
              title="Share document"
            >
              <Share2 size={16} />
              <span>Share</span>
            </button>
          )}

          {role === "OWNER" && (
            <button
              onClick={onDelete}
              className="btn-danger"
              title="Delete document"
            >
              <Trash2 size={16} />
              <span>Delete</span>
            </button>
          )}

          {role === "VIEW" && (
            <div className="badge badge-viewer">Viewer (Read Only)</div>
          )}
          {role === "COMMENT" && (
            <div className="badge badge-viewer">Commenter</div>
          )}
          {role === "EDIT" && (
            <div className="badge badge-editor">Editor Access</div>
          )}
          {role === "OWNER" && (
            <div className="badge badge-owner">Owner</div>
          )}
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="editor-toolbar">
        <button
          className={`toolbar-btn ${editor.isActive("bold") ? "active" : ""}`}
          onClick={() => editor.chain().toggleBold().run()}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isReadOnly}
          title="Bold (Ctrl+B)"
        >
          <BoldIcon size={16} />
        </button>

        <button
          className={`toolbar-btn ${editor.isActive("italic") ? "active" : ""}`}
          onClick={() => editor.chain().toggleItalic().run()}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isReadOnly}
          title="Italic (Ctrl+I)"
        >
          <ItalicIcon size={16} />
        </button>

        <button
          className={`toolbar-btn ${editor.isActive("underline") ? "active" : ""}`}
          onClick={() => editor.chain().toggleUnderline().run()}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isReadOnly}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size={16} />
        </button>

        <div className="toolbar-divider" />

        <button
          className={`toolbar-btn ${editor.isActive("heading", { level: 1 }) ? "active" : ""}`}
          onClick={() => editor.chain().toggleHeading({ level: 1 }).run()}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isReadOnly}
          title="Heading 1"
        >
          <H1Icon size={16} />
        </button>

        <button
          className={`toolbar-btn ${editor.isActive("heading", { level: 2 }) ? "active" : ""}`}
          onClick={() => editor.chain().toggleHeading({ level: 2 }).run()}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isReadOnly}
          title="Heading 2"
        >
          <H2Icon size={16} />
        </button>

        <button
          className={`toolbar-btn ${editor.isActive("heading", { level: 3 }) ? "active" : ""}`}
          onClick={() => editor.chain().toggleHeading({ level: 3 }).run()}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isReadOnly}
          title="Heading 3"
        >
          <H3Icon size={16} />
        </button>

        <div className="toolbar-divider" />

        <button
          className={`toolbar-btn ${editor.isActive("bulletList") ? "active" : ""}`}
          onClick={() => editor.chain().toggleBulletList().run()}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isReadOnly}
          title="Bulleted List"
        >
          <BulletListIcon size={16} />
        </button>

        <button
          className={`toolbar-btn ${editor.isActive("orderedList") ? "active" : ""}`}
          onClick={() => editor.chain().toggleOrderedList().run()}
          onMouseDown={(e) => e.preventDefault()}
          disabled={isReadOnly}
          title="Numbered List"
        >
          <OrderedListIcon size={16} />
        </button>

        {!isReadOnly && (
          <>
            <div className="toolbar-divider" />
            <label className="toolbar-btn" style={{ cursor: "pointer" }} title="Import MD/TXT/DOCX at cursor">
              <FileUp size={16} />
              <input
                type="file"
                accept=".txt,.md,.docx"
                onChange={handleFileImport}
                style={{ display: "none" }}
              />
            </label>
          </>
        )}
      </div>

      {/* Flex container for Workspace and Sidebars */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden", width: "100%", height: "100%", minHeight: 0 }}>
        {/* Editor Content Canvas */}
        <div className="editor-canvas-scroll" style={{ flex: 1, height: "100%" }}>
          <div className="editor-sheet-positioner">
            <EditorContent editor={editor} className="editor-content-wrapper" />
            
            {/* Collaboration presence cursor overlay */}
            {presences && presences.map((p) => {
              if (!p.cursorPos) return null;
              let pos;
              try {
                pos = JSON.parse(p.cursorPos);
              } catch (e) {
                return null;
              }
              if (!pos || typeof pos.top !== "number" || typeof pos.left !== "number") return null;
              return (
                <div
                  key={p.id}
                  className="collab-cursor"
                  style={{
                    top: `${pos.top}px`,
                    left: `${pos.left}px`
                  }}
                >
                  <span className="collab-cursor-bar" style={{ backgroundColor: p.color || "#10b981" }} />
                  <span className="collab-cursor-flag" style={{ backgroundColor: p.color || "#10b981" }}>
                    {p.user?.name ? p.user.name.split(" ")[0] : "User"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Floating Right Side Panels */}
        {isCommentsOpen && (
          <CommentsPanel
            documentId={documentId}
            editor={editor}
            activeUserId={activeUserId}
            onClose={() => setIsCommentsOpen(false)}
          />
        )}

        {isVersionsOpen && (
          <VersionHistoryPanel
            documentId={documentId}
            activeUserId={activeUserId}
            canManage={role === "OWNER" || role === "EDIT"}
            onClose={() => setIsVersionsOpen(false)}
            onRestore={handleRestore}
          />
        )}
      </div>
    </div>
  );
}
