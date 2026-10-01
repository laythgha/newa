# Layth Gharbia
IT Systems Administration · Full-Stack Web Development · AI Engineering · Laythgha17@gmail.com · LinkedIn

# Summary
IT Systems Administration professional with 1 year of hands-on support experience and a background in full-stack web development. Skilled at troubleshooting Windows and macOS hardware and software issues, managing Active Directory and Office 365 accounts, and monitoring network performance. Proven ability to streamline operations through technical documentation and proactive system maintenance. Currently training as an AI engineer, and has built and deployed a retrieval-augmented (RAG) AI chatbot for a freelance client.

# Technical Skills
- Languages: TypeScript, JavaScript, Python, C++, HTML
- Frameworks and tools: React.js, Next.js, Firebase (Firestore, Auth, Cloud Functions), Vercel, Git
- Concepts: REST APIs, real-time data, responsive UI, accessibility basics, Agile/Scrum
- Databases: MySQL, Firebase Firestore
- IT administration: Windows and macOS troubleshooting, Active Directory, Office 365 account management, network monitoring, workstation setup
- AI engineering: LLM APIs (Abacus.AI RouteLLM, Anthropic Claude), retrieval-augmented generation (RAG), BM25 search, prompt engineering, streaming responses (SSE)
- Backend, testing and deployment: Node.js, Express, Playwright, Render (infrastructure-as-code Blueprints), Python and Pillow for image processing

# Education
University of North Texas, B.S. Computer Science, graduating 2026.
Coursework: Data Structures & Algorithms, Databases & SQL, Operating Systems, Computer Networks, Web Development.

# Experience
## Freelance AI / Web Developer, Self-employed (Oct 2026 - present)
AI Resume Assistant for an executive client (a CIO/CTO).
- Designed, built and deployed a retrieval-augmented (RAG) chatbot that answers recruiters' questions from the client's resume and Q&A documents. It installs on any website, including WordPress, with a single script tag.
- Built the retrieval pipeline in Node.js and Express: documents are chunked by section and Q&A pair into a BM25 index that is cached to disk and rebuilt only when content changes, and the most relevant passages ground every answer.
- Integrated large language models behind a provider-agnostic layer (Abacus.AI RouteLLM and Anthropic Claude) with streamed, word-by-word answers. Engineered the system prompt to stay factual, make reasonable inferences in the client's favor, and share the client's booking link.
- Developed an embeddable Shadow DOM chat widget with an animated robot mascot (waving, blinking, eyes that follow the cursor) and themes matched to the client's brand; prepared the artwork with Python and Pillow (background removal, layer separation).
- Built owner tools inside the chat: the client types /admin, logs in, and uploads Word (.docx) files; the bot detects the client's name automatically, and the edit button is visible only on the client's own devices.
- Hardened it for production: the bot locks itself to the client's website, per-visitor and daily request caps bound API costs, and authentication is timing-safe. Deployed two services on Render with an infrastructure-as-code Blueprint and persistent storage, and verified it with Playwright browser tests and unit tests.

## Texas Auto Buy, IT / Systems Administration Intern (Nov 2024 - Jan 2026)
- Served as subject matter expert and business analyst for an AI-driven vehicle pricing system, translating complex automotive purchasing logic into functional technical requirements.
- Liaised between business stakeholders and the engineering team, clarifying requirements and aligning the development roadmap with dealership operational goals.
- Led User Acceptance Testing (UAT) by designing test cases and validating AI-generated pricing features before production release, reducing post-launch functional errors.
- Optimized the software development lifecycle (SDLC) by documenting business rules and edge cases for vehicle valuation, enabling the dev team to build more accurate predictive models.
- Provided day-to-day IT support for staff, diagnosing and resolving workstation and software incidents to maintain operational continuity.
- Supported an AI-based vehicle acquisition tool by helping staff use the system, monitoring issues, and ensuring it remained functional during daily operations.
- Set up and maintained employee workstations: installed and configured applications, performed basic troubleshooting, and ensured devices were ready for use.
- Managed user access tasks, including account setups, permission updates, and password resets.
- Troubleshot network connectivity, Wi-Fi, and office systems such as printers; coordinated escalations with vendors and ISPs.
- Improved operational efficiency by documenting common fixes and creating repeatable setup steps for new devices and users.

## Paciugo, Manager (Jul 2020 - Jan 2023)
- Played a lead role in opening a new store location, managing the physical and employment infrastructure and establishing daily operations.
- Led daily store operations in a customer-facing, high-volume environment; ensured smooth shift execution and strong customer experience.
- Trained and coached team members; helped enforce quality, safety, and service standards.

## Which Wich, Manager (Sep 2018 - Jan 2023)
- Supervised daily operations and team performance while keeping service standards.
- Maintained an organized work area and strict rules for safety and food protocols.
- Demonstrated reliability through long-term employment and consistency.

# Projects
## Doctor Finder (web app)
- Built a web app that helps users search for and compare doctors by specialty, location, and insurance; displays ratings, reviews, and profile details.
- Built in Agile/Scrum sprints with sprint planning, daily standups, sprint reviews, and retrospectives to deliver incremental features on schedule.
- Maintained and executed sprint work in a shared backlog (user stories, priorities, acceptance criteria), coordinating tasks across teammates.
- Estimated and scoped user stories and broke features into small, testable deliverables to improve velocity and reduce last-minute bugs.
- Collaborated through code reviews and pull requests each sprint, resolving blockers quickly and maintaining code quality.
- Designed and implemented key frontend components with a responsive, mobile-friendly UI, improving usability through iterative feedback.
- Implemented the backend with Firebase (Firestore, Auth, Cloud Functions) for real-time data fetching and dynamic profiles.
- Added real-time updates and notifications using Firestore listeners; deployed with CI/CD on Vercel.
