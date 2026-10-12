# Carepath

Carepath is a personal health-information assistant designed for calm, thoughtful guidance.

- **Without an API key**: Runs 100% locally using breadth-first and heuristic topic search across curated health guidance.
- **With an API key**: Connects to OpenAI (or any OpenAI-compatible provider such as Groq or OpenRouter) for contextual conversational responses.
- **Privacy by Design**: Chat history and health profile details stay in each user's browser. AI responses require explicit opt-in in the user profile.

---

## Quick Start (Local)

### 1. Requirements
- Node.js 18.17+ or 20+

### 2. Configure Environment
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Open `.env` and set your API key (optional):
```env
PORT=3000
NODE_ENV=development
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

> **Note**: Even without an API key, Carepath works completely out of the box with built-in heuristic health guidance.

### 3. Start the Server

```bash
npm start
```

Or for development with automatic reload on changes:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Authentication & Sessions

- **Password Hashing**: Secure `crypto.scrypt` with individual random 16-byte salt per account.
- **Stateless & Resilient Sessions**: Tokens are signed using HMAC-SHA256 with a persistent server secret (`SESSION_SECRET` or `.carepath-data/session.secret`). Sessions survive server restarts and redeployments.
- **Cookie Security**: `HttpOnly`, `SameSite=Lax`, and automatic `Secure` flag on HTTPS / production.
- **Data Location**: Account records are stored under `.carepath-data/accounts.json` (excluded from git).

---

## Testing & Verification

Run the automated integration test suite:

```bash
npm test
```

Run the build & syntax check:

```bash
npm run build
```

---

## Deployment Guide

Carepath is a zero-external-dependency Node.js application, making it lightweight and deployable almost anywhere.

### Option 1: Deploy to Render (Recommended - Free Tier)

1. Push your repository to GitHub or GitLab:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   # push to your remote repo
   ```
2. In [Render Dashboard](https://dashboard.render.com/):
   - Click **New +** > **Web Service**.
   - Connect your repository.
   - Render will detect the included [`render.yaml`](render.yaml) or you can manually set:
     - **Runtime**: `Node`
     - **Build Command**: `npm run build`
     - **Start Command**: `npm start`
3. In **Environment Variables**:
   - `OPENAI_API_KEY`: your OpenAI or compatible API key.
   - `OPENAI_MODEL`: `gpt-4o-mini` (or your preferred model).
   - `NODE_ENV`: `production`
4. Click **Deploy Web Service**.

### Option 2: Deploy to Railway / Fly.io

- **Railway**: Simply connect your GitHub repository; Railway automatically runs `npm run build` and `npm start`. Add `OPENAI_API_KEY` in the service variables.
- **Fly.io**: Run `fly launch` and it will use the included [`Dockerfile`](Dockerfile). Set secrets using `fly secrets set OPENAI_API_KEY=...`.

### Option 3: Deploy with Docker

A multi-stage production [`Dockerfile`](Dockerfile) is included:

```bash
# Build the Docker image
docker build -t carepath .

# Run the container
docker run -d -p 3000:3000 \
  -e NODE_ENV=production \
  -e OPENAI_API_KEY="your-key-here" \
  carepath
```

---

## Security & Disclaimer

Carepath provides general health education and next-step framing only. It does not provide diagnoses or personalized treatment plans. In any medical emergency, users should contact their local emergency services immediately.