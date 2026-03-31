# RSS Reader - Specification

## Overview

A modern, self-hosted RSS/Atom feed reader with smart features for content discovery, filtering, and reading experience optimization.

## Core Features

### Feed Management
- Subscribe to RSS 2.0, Atom 1.0, and JSON Feed formats
- Auto-discover feeds from website URLs (parse `<link>` tags)
- Organize feeds into folders/categories
- Import/export via OPML
- Per-feed refresh intervals (default: 30 minutes)
- Feed health monitoring (detect dead feeds, track error rates)

### Article Reading
- Clean, distraction-free reading view
- Fetch full article content when feeds provide only summaries (readability extraction)
- Rewrite the titles based on the content, no clickbait titles
- Mark articles as read/unread/starred
- Keyboard navigation (j/k for next/prev, s to star, m to toggle read)
- Track reading position for long articles
- Estimated reading time per article

### Search & Filtering
- Full-text search across all articles
- Filter by feed, folder, date range, read/unread/starred status
- Saved searches (virtual folders)

### Data & Storage
- SQLite database for metadata and article content
- Configurable article retention (default: 90 days, starred articles kept indefinitely)
- Periodic cleanup of old articles and orphaned media

---

## Smart Features

### 1. AI-Powered Article Summarization
- Generate concise summaries (1-3 sentences) for each article on demand or automatically
- Useful for quickly triaging high-volume feeds
- Local LLM support (Ollama) to keep data private, with optional cloud LLM fallback

### 2. Smart Feed Ranking & Prioritization
- Learn from reading patterns: which feeds/topics you actually read vs. skip
- Surface high-priority articles at the top of the feed
- "Focus mode" that shows only articles predicted to be relevant based on history
- Decay factor: articles lose priority score over time to keep the feed fresh

### 3. Duplicate & Near-Duplicate Detection
- Detect when multiple feeds cover the same story (common with news)
- Cluster related articles together, show the best source, link to alternatives
- Uses content similarity hashing (SimHash or MinHash) rather than exact URL matching

### 4. Topic Extraction & Auto-Tagging
- Automatically tag articles with topics (e.g., "rust", "security", "machine-learning")
- Build a personal topic graph over time
- Filter and browse by auto-generated topics
- Discover topic trends: "security articles are up 40% this week"

### 5. Smart Notifications & Digest
- Daily/weekly email or push digest of top articles
- Keyword-based alerts: get notified immediately when specific terms appear
- "Quiet hours" and batching to avoid notification fatigue
- Digest includes AI-generated summary of top stories

### 6. Read-Later & Reading Queue
- One-click "read later" with automatic priority ordering
- Estimate total reading time for the queue
- Suggest when to read based on article length and available time slots
- Auto-archive stale queue items after configurable period

### 7. Feed Discovery & Recommendations
- "Related feeds" suggestions based on content overlap with feeds you already follow
- Trending feeds in your topic areas (optional, via public feed directories)
- One-click subscribe from recommendation list
- Detect when a feed you follow links frequently to another source and suggest it

### 8. Content Health & Quality Signals
- Track feed quality metrics: post frequency, content length, engagement (do you read them?)
- Flag feeds that have gone stale (no posts in X days)
- Flag feeds with declining quality (shorter posts, more ads, lower read rate)
- Suggest unsubscribing from low-value feeds

### 9. Reading Analytics Dashboard
- Articles read per day/week/month
- Time spent reading
- Topic distribution over time
- Reading streaks and patterns
- Feed leaderboard (most/least read)

### 10. Smart Bookmarking & Highlights
- Highlight passages within articles
- Add personal notes to articles
- Search across all highlights and notes
- Export highlights in Markdown format
- Link highlights to related highlights across articles

---

## Technical Architecture

### Backend
- **Language:** Node (performance, low resource usage for self-hosting)
- **Database:** SQLite (single-file, zero-config, portable)
- **Feed parsing:** Dedicated RSS/Atom/JSON Feed parser library
- **Scheduler:** Background worker for feed fetching on configurable intervals
- **API:** REST API for all operations (enables multiple frontends)
- **Auth:** Single-user by default, optional multi-user with session-based auth

### Frontend
- **Web UI:** Responsive SPA (works on desktop and mobile)
- **Framework:** vanilla JS
- **Offline support:** Service worker for reading cached articles without connectivity
- **Themes:** Light/dark mode, customizable font size and line spacing

### Deployment
- Single binary with embedded frontend assets
- Docker image available
- Minimal resource requirements (target: <100MB RAM idle)
- Configuration via TOML file or environment variables

---

## API Design (Summary)

| Method | Endpoint                  | Description                    |
|--------|---------------------------|--------------------------------|
| GET    | /api/feeds                | List all feeds                 |
| POST   | /api/feeds                | Subscribe to a new feed        |
| DELETE | /api/feeds/:id            | Unsubscribe from a feed        |
| GET    | /api/feeds/:id/articles   | List articles for a feed       |
| GET    | /api/articles             | List/search all articles       |
| GET    | /api/articles/:id         | Get single article             |
| PATCH  | /api/articles/:id         | Update article (read/star)     |
| GET    | /api/articles/:id/summary | Get AI summary for article     |
| GET    | /api/folders              | List folders                   |
| POST   | /api/folders              | Create folder                  |
| GET    | /api/topics               | List auto-detected topics      |
| GET    | /api/stats                | Reading analytics              |
| POST   | /api/opml/import          | Import OPML                    |
| GET    | /api/opml/export          | Export OPML                    |

---

## Non-Functional Requirements

- **Performance:** Render feed list in <200ms, fetch and parse a feed in <5s
- **Privacy:** No telemetry, no external requests except feed fetching (unless user opts in)
- **Accessibility:** WCAG 2.1 AA compliance for the web UI
- **Extensibility:** Plugin/webhook system for custom integrations (e.g., send to Pocket, Notion, Logseq)
