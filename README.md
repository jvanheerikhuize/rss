# RSS Reader

A modern, self-hosted RSS/Atom feed reader with a clean reading experience and smart features.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)

## Features

- **Multi-format support** — RSS 2.0, Atom 1.0, and JSON Feed
- **Auto-discovery** — paste any website URL and feeds are found automatically
- **Full-content extraction** — fetches complete articles when feeds only provide summaries
- **Full-text search** — powered by SQLite FTS5
- **Keyboard navigation** — j/k, star, mark read, and more
- **Light/dark theme** — follows system preference, toggleable
- **Background refresh** — configurable per-feed intervals
- **Mobile responsive** — works on desktop, tablet, and phone
- **Self-hosted** — your data stays on your server, no telemetry

## Quick Start

```bash
git clone https://github.com/jvanheerikhuize/rss.git
cd rss
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Docker

```bash
docker build -t rss-reader .
docker run -d -p 3000:3000 -v rss-data:/app/data rss-reader
```

Or with Docker Compose:

```bash
docker compose up -d
```

## Configuration

Copy `config.default.toml` to `config.toml` and edit as needed:

```toml
[server]
port = 3000
host = "0.0.0.0"

[database]
path = "./data/rss.db"

[feeds]
default_refresh_interval = 1800  # seconds (30 minutes)
fetch_concurrency = 3

[articles]
retention_days = 90

[ai]
enabled = false
ollama_url = "http://localhost:11434"
model = "llama3"
```

All settings can also be overridden with environment variables:

| Variable | Description |
|----------|-------------|
| `RSS_SERVER_PORT` | Server port (default: 3000) |
| `RSS_SERVER_HOST` | Server host (default: 0.0.0.0) |
| `RSS_DATABASE_PATH` | SQLite database path |
| `RSS_AI_ENABLED` | Enable AI features (true/false) |
| `RSS_AI_OLLAMA_URL` | Ollama API URL |
| `RSS_AI_MODEL` | LLM model name |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` / `k` | Next / previous article |
| `s` | Toggle star |
| `m` | Toggle read/unread |
| `v` | Open original in new tab |
| `r` | Refresh current feed |
| `/` | Focus search |
| `a` | Subscribe to feed |
| `Esc` | Close modal / deselect |
| `?` | Show shortcuts help |

## API

All data is accessible via a REST API:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/feeds` | List all feeds |
| `POST` | `/api/feeds` | Subscribe to a feed |
| `PATCH` | `/api/feeds/:id` | Update a feed |
| `DELETE` | `/api/feeds/:id` | Unsubscribe |
| `POST` | `/api/feeds/:id/refresh` | Refresh a feed |
| `GET` | `/api/articles` | List/search articles |
| `GET` | `/api/articles/:id` | Get article with full content |
| `PATCH` | `/api/articles/:id` | Update read/star/position |
| `POST` | `/api/articles/mark-read` | Batch mark as read |
| `GET` | `/api/folders` | List folders |
| `POST` | `/api/folders` | Create folder |
| `PATCH` | `/api/folders/:id` | Update folder |
| `DELETE` | `/api/folders/:id` | Delete folder |
| `GET` | `/api/health` | Health check |

## Development

```bash
npm run dev    # starts with --watch for auto-restart
```

## Tech Stack

- **Backend:** Node.js, Express, better-sqlite3
- **Frontend:** Vanilla JavaScript (ES modules, no build step)
- **Database:** SQLite with WAL mode and FTS5
- **Feed parsing:** rss-parser
- **Content extraction:** @extractus/article-extractor

## License

[MIT](LICENSE)
