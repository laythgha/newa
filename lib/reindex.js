// Rebuilds the index from docs/ by hand: `npm run reindex`.
// (The server also does this on its own whenever the documents change.)
import { loadOrBuildIndex, INDEX_FILE } from "./indexer.js";

const { index } = loadOrBuildIndex({ force: true });
const counts = index.chunks.reduce((acc, c) => ({ ...acc, [c.source]: (acc[c.source] || 0) + 1 }), {});
console.log(
  `Indexed ${counts.resume || 0} resume sections and ${counts.qa || 0} Q&A pairs -> ${INDEX_FILE}`,
);
