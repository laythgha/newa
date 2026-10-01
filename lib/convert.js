// Turns an uploaded Word (.docx) or text file into the plain text the bot indexes.
// Headings become "# Heading" lines and list items "- item" lines, so the resume
// is split into sections the same way as a hand-written one.

import mammoth from "mammoth";

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

function decode(s) {
  return s
    .replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === "#") {
        const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : m;
      }
      return ENTITIES[e.toLowerCase()] ?? m;
    })
    .replace(/ /g, " ");
}

export function htmlToText(html) {
  return decode(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (m, n, t) => `\n\n# ${t.replace(/<[^>]+>/g, "").trim()}\n\n`)
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (m, t) => `\n- ${t.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}`)
      .replace(/<\/(p|ul|ol|table|tr)>/gi, "\n\n")
      .replace(/<\/t[dh]>/gi, "  ")
      .replace(/<[^>]+>/g, ""),
  )
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function fileToText(filename, buffer) {
  const ext = (filename.match(/\.([a-z0-9]+)$/i)?.[1] || "").toLowerCase();
  if (ext === "docx") {
    const { value } = await mammoth.convertToHtml({ buffer });
    return htmlToText(value);
  }
  if (ext === "txt" || ext === "md") return buffer.toString("utf8").replace(/^﻿/, "");
  if (ext === "doc") {
    throw new Error('Old ".doc" Word files aren\'t supported. In Word, use File > Save As > Word Document (.docx) and upload that.');
  }
  throw new Error("Please upload a Word document (.docx) or a text file (.txt).");
}
