# MockAgent_AI

A full-stack AI mock interview platform built with Vite, React, Express, MongoDB Atlas, and Gemini AI.

## Project Overview

This repository contains:
- `server.ts` — Express backend with API routes for auth, resumes, interviews, analytics, and TTS
- `src/` — React + Vite frontend UI for dashboard, practice, history, leaderboard, and admin views
- `server/db.ts` — database wrapper that uses MongoDB Atlas when `MONGODB_URI` is set, otherwise falls back to local JSON
- `server/mongoClient.ts` — MongoDB Atlas client helper
- `Dockerfile` and `docker-compose.yml` — container deployment setup
- `scripts/migrate-to-mongo.js` — utility to copy local JSON data into MongoDB Atlas

## Features

- User registration, login, and admin bypass
- Resume upload and text embedding
- Interview session flow with question/answer handling
- AI-generated voice via Gemini TTS
- Dashboard analytics, leaderboard, history, and audit pages
- MongoDB Atlas remote storage support
- Docker and Docker Compose support for production deployment

## Prerequisites

- Node.js 20+
- npm
- MongoDB Atlas cluster or remote MongoDB URI
- Gemini API key with Generative Language API enabled

## Local Setup

1. Install dependencies:
   ```powershell
   npm install
   ```

2. Create a `.env` file in the project root with:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   MONGODB_URI=your_mongodb_atlas_uri_here
   MONGODB_DB=Mock_Agent
   PORT=3000
   APP_URL=http://localhost:3000
   NODE_ENV=production
   ```

3. Run the app locally:
   ```powershell
   npm run build
   npm start
   ```

4. Open the app in your browser:
   ```
   http://localhost:3000
   ```

## Development

For development with Vite middleware and hot reload:

```powershell
npm run dev
```

> Note: `npm run dev` starts the server with `tsx server.ts` and the Vite development middleware.

## Docker

Build and run locally with Docker:

```powershell
docker build -t mock_agent_ai-app .
docker run --rm -p 3000:3000 --env-file .env mock_agent_ai-app
```

## Docker Compose

Start with Docker Compose:

```powershell
docker compose up --build -d
```

Stop it with:

```powershell
docker compose down
```

## MongoDB Atlas

1. Create or use an existing Atlas cluster.
2. Create a database user and whitelist your IP or allow access from anywhere.
3. Set `MONGODB_URI` in `.env`, for example:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.mongodb.net/
   ```
4. (Optional) Run the migration script to import local JSON data:
   ```powershell
   node scripts/migrate-to-mongo.js --uri "$env:MONGODB_URI" --db "Mock_Agent"
   ```

## Deployment

### Render

1. Push this repo to GitHub.
2. Create a new Render Web Service.
3. Connect to `Sabari-D/MockAgent_AI`.
4. Use Docker or Native Node:
   - Docker: Render will use `Dockerfile`
   - Node: build command `npm ci && npm run build`, start command `npm start`
5. Add environment variables:
   - `GEMINI_API_KEY`
   - `MONGODB_URI`
   - `MONGODB_DB`
   - `APP_URL`
   - `NODE_ENV=production`

### Vercel

This app should be deployed with Docker on Vercel because it is a full Express server.

1. Add `vercel.json` to the repo root with:
   ```json
   {
     "version": 3,
     "builds": [
       { "src": "Dockerfile", "use": "@vercel/docker" }
     ]
   }
   ```
2. Push to GitHub.
3. Create a Vercel project from this repo.
4. Set the same env vars on Vercel.

## GitHub

1. Initialize git and commit your files.
2. Add your GitHub remote:
   ```powershell
   git remote add origin https://github.com/Sabari-D/MockAgent_AI.git
   git branch -M main
   git push -u origin main
   ```

## Notes

- Never commit `.env` or other secrets.
- Use remote MongoDB Atlas in production.
- Ensure the Gemini API key is valid and the Generative Language API is enabled.
- If you see remote DB failures, check `MONGODB_URI` and network access.

## License

This project is provided as-is. Update the license section as needed.

