# Resume chatbot

A floating chat bubble for a personal website. Visitors ask questions and the bot
answers from two documents: your **resume** and a list of **questions & answers**.
It runs on Claude (Sonnet 5.5) with a small retrieval (RAG) layer in front.

```
visitor's browser ──► widget.js ──► this server ──► search index ──► Claude
                                      (built once from docs/, rebuilt only when they change)
```

## Adding it to your website

Paste this just before `</body>` on every page where you want the bot (replace the address
with wherever this server is hosted):

```html
<script src="https://YOUR-BOT-SERVER/widget.js" defer
        data-title="Ask about Jane"
        data-greeting="Hi! Ask me anything about Jane's experience."></script>
```

That's the whole install. The bubble sits in the bottom-right corner and doesn't move when the
page scrolls. Optional settings on the same tag:

| Attribute | What it does | Default |
|---|---|---|
| `data-title` | Text in the chat window header | `Ask me anything` |
| `data-greeting` | First message the bot shows | a generic greeting |
| `data-color` | Button and header color | `#2563eb` (blue) |
| `data-position` | `right` or `left` corner | `right` |

The widget lives in its own shadow DOM, so your site's styles won't affect it and it won't
affect your site.

## The two documents

Both are plain text files in `docs/`.

**`docs/resume.md`** (or `resume.txt`): your resume as text. Start each section with a
`#` heading (`# Experience`, `# Skills`, ...) or an ALL-CAPS line (`EXPERIENCE`) so the bot can
find the right part.

**`docs/qa.txt`** (or `qa.md`): one question per `Q:` line, answer on the `A:` line.
Answers may run onto several lines. Lines starting with `#` are ignored.

```
Q: Are you open to new opportunities?
A: Yes, senior or staff roles, full-time or contract.

Q: How can I contact you?
A: Email jane@example.com.
```

## Updating the documents

The bot does **not** read the documents on each question. They are split into sections and
indexed once; the index is saved to `data/index.json` with a fingerprint of the documents and
reused until the documents change.

To update, use either way:

1. **Admin page** (easiest): open `https://YOUR-BOT-SERVER/admin`, enter the admin password
   (`ADMIN_TOKEN`), edit, and click **Save**. The bot uses the new text right away.
2. **Edit the files** in `docs/` on the server. The server notices the change and re-indexes
   automatically. (Or run `npm run reindex`.)

> If you host on a service whose disk is wiped on every deploy (for example Render or Railway
> without a persistent disk), changes made on the admin page are lost at the next deploy.
> Either attach a persistent disk and point `DOCS_DIR` and `INDEX_FILE` to it, or update the
> files in `docs/` in this repository and redeploy.

## Running it

Requires Node.js 22 or newer and an Anthropic API key.

```bash
npm install
cp .env.example .env     # then fill in the values
npm start
```

Open http://localhost:3000/demo to try the bubble on a sample page, and
http://localhost:3000/admin to edit the documents.

**No API key yet?** Leave `ANTHROPIC_API_KEY` empty and the server starts in demo mode:
the widget, admin page and document search all work, and the bot replies with the
best-matching Q&A answer or resume section instead of a Claude-written answer. Add the key
and restart to switch to real answers.

### Settings (`.env`)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Your Claude API key. Without it the bot runs in demo mode |
| `ADMIN_TOKEN` | Password for `/admin`. If empty, the admin page is disabled |
| `ALLOWED_ORIGINS` | Comma-separated site addresses allowed to use the bot, e.g. `https://janedoe.com,https://www.janedoe.com`. Set this in production so other sites can't use your API key |
| `OWNER_NAME` | Your name, so the bot refers to you correctly |
| `PORT` | Port to listen on (default 3000) |
| `CLAUDE_MODEL` | Model to use (default `claude-sonnet-5-5`) |
| `DOCS_DIR`, `INDEX_FILE` | Where the documents and the saved index live (default `docs/`, `data/index.json`) |

### Hosting

Any Node host works (Render, Railway, Fly.io, a VPS). Build command `npm install`, start
command `npm start`, and set the variables above in the host's dashboard. Then use the
host's URL in the `<script>` tag.

## How it answers

- Each question (plus the previous one, so follow-ups work) is matched against the indexed
  resume sections and Q&A pairs with BM25 keyword search. The best 6 matches are sent to
  Claude with the question.
- Claude is told to answer only from those excerpts, prefer your prepared answers, and say
  it doesn't know rather than guess.
- Answers stream into the chat window as they're written.
- The conversation is kept in the visitor's browser tab (sessionStorage) and the last 12
  messages are sent with each question.

### Cost and abuse protection

- Each visitor IP is limited to 30 messages per 10 minutes.
- Messages are capped at 2,000 characters, and replies at 4,096 tokens.
- Claude runs at low effort, which suits short factual answers.
- If Claude declines a request on safety grounds, the API automatically retries it on a
  fallback model (`fallbacks: "default"`). If that declines too, the visitor sees a polite
  message.

## Project layout

```
server.js            API server: chat endpoint, admin endpoint, serves the widget
lib/indexer.js       Splits documents into sections, builds and searches the index
lib/reindex.js       `npm run reindex`
public/widget.js     The embeddable chat bubble
public/admin.html    Page for editing the documents
public/demo.html     Sample page for testing
docs/                resume.md and qa.txt (sample content: replace with yours)
test/                Unit tests: `npm test`
```
