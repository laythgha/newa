// Builds and searches the retrieval index for the two source documents.
//
// The documents are read and chunked only when they change: the index is
// saved to data/index.json together with a hash of the documents, and on
// startup it is reused as long as that hash still matches.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const DOCS_DIR = path.resolve(process.env.DOCS_DIR || "docs");
export const INDEX_FILE = path.resolve(process.env.INDEX_FILE || "data/index.json");

// Accepted file names. Plain text or Markdown keeps editing simple.
export const RESUME_FILES = ["resume.md", "resume.txt"];
export const QA_FILES = ["qa.md", "qa.txt"];

const MAX_CHUNK_CHARS = 900;
const STOPWORDS = new Set(
  ("a an and are as at be been but by can could did do does for from had has have " +
    "he her hers him his how i if in into is it its me my of on or our she so than " +
    "that the their them then there these they this to was we were what when where " +
    "which who whom why will with would you your yours about tell please").split(" "),
);

// ---------- loading ----------

function findFile(candidates) {
  for (const name of candidates) {
    const p = path.join(DOCS_DIR, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export function readSources() {
  const resumePath = findFile(RESUME_FILES);
  const qaPath = findFile(QA_FILES);
  return {
    resume: resumePath ? fs.readFileSync(resumePath, "utf8") : "",
    qa: qaPath ? fs.readFileSync(qaPath, "utf8") : "",
  };
}

function hashSources({ resume, qa }) {
  return crypto.createHash("sha256").update(resume).update("\0").update(qa).digest("hex");
}

// ---------- chunking ----------

// Q&A format:
//   Q: question text
//   A: answer text (may continue on following lines)
// Pairs are separated by the next "Q:" line; blank lines are optional.
export function parseQA(text) {
  const pairs = [];
  let current = null;
  let field = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const q = line.match(/^(?:Q|Question)\s*[:.)-]\s*(.*)$/i);
    const a = line.match(/^(?:A|Answer)\s*[:.)-]\s*(.*)$/i);
    if (q) {
      if (current) pairs.push(current);
      current = { question: q[1], answer: "" };
      field = "question";
    } else if (a && current) {
      current.answer = a[1];
      field = "answer";
    } else if (current && line && !line.startsWith("#")) {
      current[field] += (current[field] ? "\n" : "") + line;
    }
  }
  if (current) pairs.push(current);
  const labelled = pairs.filter((p) => p.question && p.answer);
  return labelled.length ? labelled : parseQuestionLines(text);
}

// Fallback for documents without "Q:" / "A:" labels (common in Word files):
// a line ending in "?" is a question, and the lines after it are its answer.
function parseQuestionLines(text) {
  const pairs = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim().replace(/^(?:#+|[-*\u2022]|\d+[.)])\s*/, "").replace(/\*\*/g, "");
    if (!line) continue;
    if (line.endsWith("?")) {
      if (current) pairs.push(current);
      current = { question: line, answer: "" };
    } else if (current) {
      current.answer += (current.answer ? "\n" : "") + line;
    }
  }
  if (current) pairs.push(current);
  return pairs.filter((p) => p.question && p.answer);
}

// Splits the resume into sections at Markdown headings ("# ...") or
// ALL-CAPS lines ("EXPERIENCE"), then into paragraph-sized chunks.
export function chunkResume(text) {
  const sections = [];
  let title = "Overview";
  let lines = [];
  const flush = () => {
    const body = lines.join("\n").trim();
    if (body) sections.push({ title, body });
    lines = [];
  };
  for (const line of text.split(/\r?\n/)) {
    const md = line.match(/^#{1,6}\s+(.*)$/);
    const caps = /^[A-Z][A-Z0-9 &/,'-]{2,40}:?$/.test(line.trim());
    if (md || caps) {
      flush();
      title = (md ? md[1] : line).trim().replace(/:$/, "");
    } else {
      lines.push(line);
    }
  }
  flush();

  const chunks = [];
  for (const { title, body } of sections) {
    let buf = "";
    for (const para of body.split(/\n\s*\n/)) {
      if (buf && buf.length + para.length > MAX_CHUNK_CHARS) {
        chunks.push({ title, text: buf.trim() });
        buf = "";
      }
      buf += para + "\n\n";
    }
    if (buf.trim()) chunks.push({ title, text: buf.trim() });
  }
  return chunks;
}

// The person's name, read from the top of the resume (resumes start with the name).
// Looks at the first few non-empty lines, skipping a "Resume" / "CV" title line.
export function guessOwnerName(resumeText) {
  const lines = resumeText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 4);
  for (const raw of lines) {
    const line = raw.replace(/^#+\s*/, "").replace(/\*\*|__/g, "").trim();
    if (/^(resume|résumé|cv|curriculum vitae)$/i.test(line)) continue;
    // "Jane Doe · Senior Engineer" or "Jane Doe | Austin" -> "Jane Doe"
    const candidate = line.split(/\s[·|•–—-]\s|,|\|/)[0].trim();
    const words = candidate.split(/\s+/);
    if (
      words.length >= 2 &&
      words.length <= 5 &&
      candidate.length <= 50 &&
      /^[\p{L}][\p{L}.'’ -]*$/u.test(candidate) &&
      !/\b(resume|cv|summary|experience|profile)\b/i.test(candidate)
    ) {
      // "JANE DOE" -> "Jane Doe"
      return candidate === candidate.toUpperCase()
        ? candidate.toLowerCase().replace(/(^|[\s'-])\p{L}/gu, (m) => m.toUpperCase())
        : candidate;
    }
    return "";
  }
  return "";
}

// ---------- BM25 ----------

function stem(word) {
  return word
    .replace(/(?:ies)$/, "y")
    .replace(/(?:ing|ed|es|s)$/, "")
    .slice(0, 12);
}

export function tokenize(text) {
  return (text.toLowerCase().match(/[a-z0-9+#.]+/g) || [])
    .map((w) => w.replace(/^\.+|\.+$/g, ""))
    .filter((w) => w && !STOPWORDS.has(w))
    .map(stem);
}

export function buildIndex(sources) {
  const chunks = [];
  chunkResume(sources.resume).forEach((c, i) =>
    chunks.push({ id: `resume-${i}`, source: "resume", title: c.title, text: c.text }),
  );
  parseQA(sources.qa).forEach((p, i) =>
    chunks.push({
      id: `qa-${i}`,
      source: "qa",
      title: p.question,
      text: `Q: ${p.question}\nA: ${p.answer}`,
    }),
  );

  const df = {};
  let totalLen = 0;
  for (const c of chunks) {
    // The title is indexed along with the text, so a Q&A question counts twice
    // and a visitor's wording matches it strongly.
    const tokens = tokenize(`${c.title} ${c.text}`);
    c.tf = {};
    for (const t of tokens) c.tf[t] = (c.tf[t] || 0) + 1;
    c.len = tokens.length;
    totalLen += tokens.length;
    for (const t of Object.keys(c.tf)) df[t] = (df[t] || 0) + 1;
  }

  return {
    hash: hashSources(sources),
    builtAt: new Date().toISOString(),
    avgLen: chunks.length ? totalLen / chunks.length : 0,
    df,
    chunks,
  };
}

export function search(index, query, k = 6) {
  const N = index.chunks.length;
  if (!N) return [];
  const terms = [...new Set(tokenize(query))];
  const k1 = 1.4;
  const b = 0.75;
  const scored = index.chunks.map((c) => {
    let score = 0;
    for (const t of terms) {
      const f = c.tf[t];
      if (!f) continue;
      const idf = Math.log(1 + (N - index.df[t] + 0.5) / (index.df[t] + 0.5));
      score += (idf * f * (k1 + 1)) / (f + k1 * (1 - b + (b * c.len) / index.avgLen));
    }
    return { chunk: c, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .map((s) => s.chunk);
}

// ---------- persistence ----------

function saveIndex(index) {
  fs.mkdirSync(path.dirname(INDEX_FILE), { recursive: true });
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index));
}

function loadSavedIndex() {
  try {
    return JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
  } catch {
    return null;
  }
}

// Returns the current index, rebuilding it only if the documents changed
// since it was last saved (or if `force` is set).
export function loadOrBuildIndex({ force = false } = {}) {
  const sources = readSources();
  const hash = hashSources(sources);
  const saved = force ? null : loadSavedIndex();
  if (saved && saved.hash === hash) return { index: saved, rebuilt: false };
  const index = buildIndex(sources);
  saveIndex(index);
  return { index, rebuilt: true };
}
