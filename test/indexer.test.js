import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQA, chunkResume, buildIndex, search, guessOwnerName } from "../lib/indexer.js";

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

test("guessOwnerName reads the name from the top of the resume", () => {
  assert.equal(guessOwnerName("# Jane Doe\nSenior Engineer"), "Jane Doe");
  assert.equal(guessOwnerName("RESUME\n\nJOHN O'NEIL\njohn@example.com"), "John O'Neil");
  assert.equal(guessOwnerName("Ana María López · Data Scientist · Madrid"), "Ana María López");
  assert.equal(guessOwnerName("Alex Smith | alex@example.com | 555-1234"), "Alex Smith");
  assert.equal(guessOwnerName("Experienced engineer with 10 years building web apps."), "");
  assert.equal(guessOwnerName(""), "");
});

test("parseQA falls back to question lines for unlabelled documents", () => {
  assert.deepEqual(parseQA("1. Are you open to relocating?\nYes, within the US.\n\nWhat is your notice period?\nTwo weeks.\nNegotiable."), [
    { question: "Are you open to relocating?", answer: "Yes, within the US." },
    { question: "What is your notice period?", answer: "Two weeks.\nNegotiable." },
  ]);
});
