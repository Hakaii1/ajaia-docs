"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, Globe, Printer } from "lucide-react";
import { Editor } from "@tiptap/react";

interface ExportMenuProps {
  editor: Editor;
  documentTitle: string;
}

export default function ExportMenu({ editor, documentTitle }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Simple HTML to Markdown converter
  const convertHtmlToMarkdown = (html: string): string => {
    let md = html;
    
    // Replace block tags
    md = md.replace(/<h1>(.*?)<\/h1>/gi, "# $1\n\n");
    md = md.replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n");
    md = md.replace(/<h3>(.*?)<\/h3>/gi, "### $1\n\n");
    md = md.replace(/<p>(.*?)<\/p>/gi, "$1\n\n");
    
    // Replace lists
    md = md.replace(/<ul>([\s\S]*?)<\/ul>/gi, "$1\n");
    md = md.replace(/<ol>([\s\S]*?)<\/ol>/gi, "$1\n");
    md = md.replace(/<li>(.*?)<\/li>/gi, "- $1\n");
    
    // Replace inline styles
    md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
    md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**");
    md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
    md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*");
    md = md.replace(/<u>(.*?)<\/u>/gi, "__$1__");
    md = md.replace(/<code>(.*?)<\/code>/gi, "`$1`");
    
    // Clean break tags
    md = md.replace(/<br\s*\/?>/gi, "\n");
    
    // Strip other remaining HTML tags
    md = md.replace(/<[^>]+>/g, "");
    
    // Decode HTML entities
    md = md.replace(/&amp;/g, "&")
           .replace(/&lt;/g, "<")
           .replace(/&gt;/g, ">")
           .replace(/&quot;/g, '"')
           .replace(/&#39;/g, "'")
           .replace(/&nbsp;/g, " ");

    return md.trim();
  };

  const handleDownloadMd = () => {
    const htmlContent = editor.getHTML();
    const mdContent = convertHtmlToMarkdown(htmlContent);
    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${documentTitle || "document"}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const handleDownloadHtml = () => {
    const htmlContent = editor.getHTML();
    // Wrap in standard HTML template for pretty printing
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${documentTitle}</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      color: #1a1a1a;
    }
    h1 { border-bottom: 1px solid #eee; padding-bottom: 8px; }
    code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${documentTitle || "document"}.html`;
    link.click();
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  const handleDownloadPdf = async () => {
    setIsOpen(false);
    const element = document.querySelector(".editor-canvas") as HTMLElement;
    if (!element) return;

    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      const opt: any = {
        margin:       15,
        filename:     `${documentTitle || "document"}.pdf`,
        image:        { type: "jpeg", quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" }
      };
      html2pdf().from(element).set(opt).save();
    } catch (error) {
      console.error("PDF generation failed:", error);
      alert("Failed to generate PDF download.");
    }
  };

  return (
    <div className="user-selector" ref={menuRef} style={{ width: "auto" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary"
        title="Export document"
      >
        <Download size={16} />
        <span>Export</span>
      </button>

      {isOpen && (
        <div className="user-dropdown" style={{ right: 0, left: "auto", minWidth: "180px", top: "110%" }}>
          <div className="user-dropdown-item" onClick={handleDownloadMd}>
            <FileText size={16} style={{ color: "var(--primary)" }} />
            <span style={{ fontSize: "0.85rem" }}>Download Markdown</span>
          </div>
          <div className="user-dropdown-item" onClick={handleDownloadHtml}>
            <Globe size={16} style={{ color: "var(--badge-viewer-text)" }} />
            <span style={{ fontSize: "0.85rem" }}>Download HTML</span>
          </div>
          <div className="user-dropdown-item" onClick={handleDownloadPdf}>
            <Printer size={16} style={{ color: "var(--badge-owner-text)" }} />
            <span style={{ fontSize: "0.85rem" }}>Download PDF</span>
          </div>
        </div>
      )}
    </div>
  );
}
