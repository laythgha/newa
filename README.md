# Resume chatbot

A floating chat bubble for a personal website. Visitors ask questions and the bot
answers from two documents: your **resume** and a list of **questions & answers**.
It runs on Abacus.AI RouteLLM or Claude (Sonnet 5.5), with a small retrieval (RAG) layer in front.

```
visitor's browser ──► widget.js ──► this server ──► search index ──► Claude
                                      (built once from docs/, rebuilt only when they change)
```

## Adding it to your website

Paste this one line just before `</body>` on every page where you want the bot (replace the
address with wherever this server is hosted):

```html
<script src="https://YOUR-BOT-SERVER/widget.js" defer></script>
```

That's the whole install. An "Ask about Jane" button sits in the bottom-right corner and doesn't
move when the page scrolls. It opens a chat panel with suggested questions for recruiters; on
phones the panel opens full screen. The name and look come from the server's `.env` (`OWNER_NAME` and the optional `WIDGET_*`
settings), so the tag itself needs nothing else. You can also override any of them with
attributes on the tag:

| Attribute | What it does | Default |
|---|---|---|
| `data-name` | Person the bot answers about; used for the header, initials and default text | none |
| `data-subtitle` | Line under the name in the header | `AI assistant` |
| `data-avatar` | URL of a headshot to show instead of initials | initials |
| `data-greeting` | First message the bot shows | built from `data-name` |
| `data-suggestions` | Starter questions, separated by `\|` | tech stack, experience, open to roles, contact |
| `data-launcher` | `robot` for the animated robot mascot (waves, eyes follow the cursor, blinks, hops when clicked), or `pill` for a plain gradient button | `robot` |
| `data-robot` | URL of a different mascot image (transparent PNG) | `robot.png` on the bot server |
| `data-label` | Accessible name of the launcher (and its text in `pill` mode) | `Ask about <first name>` |
| `data-teaser` | Second line of the speech bubble that pops up after a few seconds (once per visit), or `off` | a short "Hiring? Ask me..." line |
| `data-color` | Main accent color (header, button, visitor messages) | `#4f46e5` (indigo) |
| `data-color2` | Second color of the gradient; set it equal to `data-color` for a flat color | `#7c3aed` (violet) |
| `data-theme` | `light`, `dark`, `navy` (deep navy with blue accents), or `auto` (follows the visitor's system setting) | `light` |
| `data-position` | `right` or `left` corner | `right` |

Your own buttons can open the chat too: `onclick="ResumeChatbot.open()"`, or
`ResumeChatbot.ask('Is Jane open to new roles?')` to open it with a question already asked.

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

## Updating the documents from the chat (owner)

Everything happens inside the chat on the owner's own site:

1. Open the chat on your site and type **/admin** as a message.
2. Enter the password in the chat. Your documents appear right in the conversation, with
   **Upload resume (Word)** and **Upload Q&A (Word)** buttons. Uploads are saved immediately.
3. From then on, on that device, a pencil in the chat header brings these tools back. Visitors
   never see it, and typing /admin still needs the password.

Logging in this way also locks the bot to that website if it wasn't locked yet. "Open full editor"
shows the side-by-side text editor; "Log out on this device" removes the pencil.

## Updating the documents

On the documents page (`/admin`), click **Upload Word file** above either box to load a
`.docx` (or `.txt`) file. Word headings become resume sections. The Q&A file can use `Q:` / `A:`
lines, or simply put each question on its own line ending with `?` and the answer below it.
Check the text, then click **Save**.


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

Requires Node.js 22 or newer, and an Abacus.AI or Anthropic API key for AI-written answers.

```bash
npm install
cp .env.example .env     # then fill in the values
npm start
```

Open http://localhost:3000/demo to try the bubble on a sample page, and
http://localhost:3000/admin to edit the documents. (Set `DOCS_PAGE_PATH` to use a different address.)

**No API key yet?** Leave `ABACUS_API_KEY` and `ANTHROPIC_API_KEY` empty and the server starts in demo mode:
the widget, admin page and document search all work, and the bot replies with the
best-matching Q&A answer or resume section instead of a Claude-written answer. Add the key
and restart to switch to real answers.

### Settings (`.env`)

| Variable | Purpose |
|---|---|
| `BOOKING_URL` | Optional scheduling link (e.g. Google Calendar booking page). Adds a "Book a call" button to the chat, and the AI shares it when visitors want to talk |
| `CREDIT_URL` | Optional link for the "Developed by Layth Gharbia" credit at the bottom of the chat (defaults to Layth's LinkedIn). `CREDIT_NAME` changes the name, or `off` hides the credit |
| `WIDGET_THEME` | Optional widget theme: `light`, `dark`, `navy`, `auto` |
| `ABACUS_API_KEY` | Abacus.AI RouteLLM key. If set, Abacus writes the answers |
| `ABACUS_MODEL` | Model on Abacus (default `route-llm`, which picks a model per question) |
| `ANTHROPIC_API_KEY` | Claude API key, used when no Abacus key is set. With neither key the bot runs in demo mode |
| `ADMIN_TOKEN` | Password for the documents page (`/admin`). If empty, the admin page is disabled |
| `ALLOWED_ORIGINS` | Optional. Comma-separated sites allowed to use the bot. If empty, the bot locks itself to the first website that uses the chat (shown on the admin page, with an Unlock button). Your own computer (`localhost`) always works for testing |
| `OWNER_NAME` | Optional. The person's name. If empty, it's read from the first line of the resume |
| `PORT` | Port to listen on (default 3000) |
| `CLAUDE_MODEL` | Model to use (default `claude-sonnet-5-5`) |
| `DOCS_DIR`, `INDEX_FILE` | Where the documents and the saved index live (default `docs/`, `data/index.json`) |

### Hosting on Render (recommended)

The repo includes `render.yaml`, so Render sets most things up for you:

1. Put the client's real resume and Q&A in `docs/`, commit and push.
2. In the [Render dashboard](https://dashboard.render.com), choose **New > Blueprint** and connect
   this GitHub repo (and branch).
3. Render asks for the values left blank in `render.yaml`:
   - `ABACUS_API_KEY` (or `ANTHROPIC_API_KEY`)

   The name and website don't need setting: the name is read from the top of the resume, and
   the bot locks itself to the first website that uses it.
4. Click **Apply**. Render builds the service, attaches a 1 GB persistent disk, and generates
   `ADMIN_TOKEN` (the `/admin` password). Find it under the service's **Environment** tab.
5. Render gives the service an address like `https://resume-chatbot.onrender.com`. The line for
   the client's site is then:
   ```html
   <script src="https://resume-chatbot.onrender.com/widget.js" defer></script>
   ```

The documents live on the persistent disk (`/var/data/docs`). On the very first start the server
copies them there from `docs/` in the repo; after that, the copies on the disk are what the bot
and the admin page use, so admin-page edits survive redeploys. (Changing `docs/` in the repo
later does not overwrite them; use the admin page instead.)

A persistent disk needs a paid Render instance (the `starter` plan in `render.yaml`).

### Two services from one repo

`render.yaml` defines two services:

- **resume-chatbot**: a client's bot (Nezar). Its documents live on its persistent disk and are
  edited at `/admin`; `docs/` in the repo only seeded the disk on first start, so changing `docs/`
  never affects it. `/demo` there is a blank test page.
- **layth-portfolio**: Layth's own site (`PORTFOLIO=true`). The home page is the portfolio, the bot
  answers from `docs/` in the repo, and there's no disk: edit `docs/` and push to update it.

### Other hosts

Any Node host works (Railway, Fly.io, a VPS). Build command `npm install`, start command
`npm start`, and set the variables above in the host's dashboard. Point `DOCS_DIR` and
`INDEX_FILE` at a persistent volume so admin-page edits are kept.

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

- Each visitor IP is limited to 30 messages per 10 minutes and 40 per day (`DAILY_LIMIT_PER_VISITOR`).
- The whole bot answers at most 300 messages per day (`DAILY_LIMIT_TOTAL`); after that it asks visitors to contact the owner directly. Counters reset at midnight UTC (and on restart).
- Requests without a browser `Origin` header (plain scripts) are refused.
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
public/portfolio.html Layth's portfolio site (served at / and /demo when PORTFOLIO=true)
public/test.html     Blank test page with the widget (/demo otherwise)
docs/                resume.md and qa.txt: Layth's documents (also the first-start seed for a disk)
test/                Unit tests: `npm test`
```
