import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";

function parseMarkdownToHtml(markdown: string): string {
  return markdown
    .split(/\n\s*\n/)
    .map((para) => {
      const trimmed = para.trim();
      if (!trimmed) return "";
      
      if (trimmed.startsWith("# ")) {
        return `<h1>${trimmed.replace("# ", "")}</h1>`;
      } else if (trimmed.startsWith("## ")) {
        return `<h2>${trimmed.replace("## ", "")}</h2>`;
      } else if (trimmed.startsWith("### ")) {
        return `<h3>${trimmed.replace("### ", "")}</h3>`;
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const listItems = trimmed
          .split("\n")
          .map(item => `<li>${item.replace(/^[-*]\s+/, "")}</li>`)
          .join("");
        return `<ul>${listItems}</ul>`;
      } else if (/^\d+\.\s+/.test(trimmed)) {
        const listItems = trimmed
          .split("\n")
          .map(item => `<li>${item.replace(/^\d+\.\s+/, "")}</li>`)
          .join("");
        return `<ol>${listItems}</ol>`;
      }
      return `<p>${trimmed.replace(/\n/g, "<br>")}</p>`;
    })
    .filter(Boolean)
    .join("");
}

export async function POST(req: NextRequest) {
  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const fileExtension = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "md", "docx"].includes(fileExtension || "")) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a .txt, .md, or .docx file." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let htmlContent = "";

    if (fileExtension === "docx") {
      const result = await mammoth.convertToHtml({ buffer });
      htmlContent = result.value; // Conversion to raw HTML
    } else if (fileExtension === "md") {
      const text = buffer.toString("utf-8");
      htmlContent = parseMarkdownToHtml(text);
    } else {
      // plain txt
      const text = buffer.toString("utf-8");
      htmlContent = text
        .split(/\n\s*\n/)
        .map((para) => `<p>${para.trim().replace(/\n/g, "<br>")}</p>`)
        .join("");
    }

    return NextResponse.json({
      html: htmlContent,
      title: file.name.replace(/\.[^/.]+$/, "")
    });
  } catch (error: any) {
    console.error("Import file error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
