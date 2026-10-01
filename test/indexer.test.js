import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQA, chunkResume, buildIndex, search } from "../lib/indexer.js";

test("parseQA reads Q:/A: pairs, multi-line answers, and skips comments", () => {
  const pairs = parseQA(`# comment
Q: Open to remote?
A: Yes.
Q: Tell me about leadership
A: Led a team of five.
Mentors juniors.

Q: Missing answer`);
  assert.deepEqual(pairs, [
    { question: "Open to remote?", answer: "Yes." },
    { question: "Tell me about leadership", answer: "Led a team of five.\nMentors juniors." },
  ]);
});

test("chunkResume splits on markdown and ALL-CAPS headings", () => {
  const chunks = chunkResume("Jane Doe\n\n# Skills\nPython\n\nEXPERIENCE\nAcme 2020");
  assert.deepEqual(chunks.map((c) => c.title), ["Overview", "Skills", "EXPERIENCE"]);
});

test("search ranks the matching Q&A pair first", () => {
  const index = buildIndex({
    resume: "# Skills\nPython, AWS",
    qa: "Q: Are you willing to relocate?\nA: Yes, to Denver.\nQ: Salary?\nA: Ask me.",
  });
  assert.equal(search(index, "would you relocate")[0].title, "Are you willing to relocate?");
  assert.equal(search(index, "aws experience")[0].source, "resume");
  assert.deepEqual(search(index, "zebra"), []);
});
