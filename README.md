# 🤖 Automated Talent Evaluator

An elite, production-grade AI-powered mock interview and skill assessment platform. It leverages **Google Gemini 2.5 Flash** for dual-interviewer personas, deep semantic resume parsing, voice-synthesized interview interactions, and real-time analytical evaluation of candidate responses.

---

## 📐 Platform Architecture

The platform uses a decoupled React SPA frontend and an Express Node.js backend. Data is persisted in a remote MongoDB Atlas database, falling back to a local JSON file-based database if remote credentials are not provided.

```mermaid
graph TD
    classDef client fill:#e0f2fe,stroke:#0284c7,stroke-width:2px;
    classDef server fill:#fef9c3,stroke:#ca8a04,stroke-width:2px;
    classDef db fill:#dcfce7,stroke:#16a34a,stroke-width:2px;
    classDef ai fill:#f3e8ff,stroke:#9333ea,stroke-width:2px;

    subgraph Client ["Client Side (Vite + React)"]
        UI["UI Layer (Dashboard, Practice, Admin, Learning)"]:::client
        AudioCtx["Browser Audio Context (TTS Playback)"]:::client
    end

    subgraph Server ["Server Side (Express Node.js)"]
        API["Express Routing & Middleware"]:::server
        AuthHandler["Authentication Handler"]:::server
        ResumeHandler["Resume & Embedding Handler"]:::server
        SessionHandler["Interview Session Manager"]:::server
        TTSHandler["Gemini TTS Wrapper / Fallback Engine"]:::server
    end

    subgraph Database ["Database Layer"]
        Mongo["MongoDB Atlas (Remote Cluster)"]:::db
        LocalJSON["Local JSON Fallback File DB"]:::db
    end

    subgraph AIEngine ["AI & External Services"]
        GeminiLLM["Google Gemini API (Gemini 2.5 Flash)"]:::ai
        GeminiTTS["Gemini Text-to-Speech Engine"]:::ai
    end

    UI <--> |HTTP / JSON REST API| API
    API --> AuthHandler
    API --> ResumeHandler
    API --> SessionHandler
    API --> TTSHandler

    SessionHandler <--> |Prompts & Evaluations| GeminiLLM
    TTSHandler <--> |Text-to-Speech Synthesis| GeminiTTS
    
    ResumeHandler <--> |Fetch / Save Resumes| Mongo
    SessionHandler <--> |Save Sessions & Scores| Mongo
    
    Mongo -.-> |Fallback if URI missing| LocalJSON

    style Client fill:#f0f9ff,stroke:#bae6fd,stroke-width:1px
    style Server fill:#fefdf0,stroke:#fef08a,stroke-width:1px
    style Database fill:#f0fdf4,stroke:#bbf7d0,stroke-width:1px
    style AIEngine fill:#faf5ff,stroke:#e9d5ff,stroke-width:1px
```

---

## 🔄 End-to-End Interview Workflow

The sequence below illustrates a voice-based interactive session. Dual AI interviewers generate context-aware questions tailored to the candidate's resume and real-time performance.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Browser)
    participant Front as Frontend App
    participant Back as Express Backend
    participant Gemini as Gemini AI
    participant DB as MongoDB Atlas

    User->>Front: Selects Role & Interviewer Persona (Sarah / Alex)
    Front->>Back: Post /api/interviews/start (Session Config)
    Back->>Gemini: Request Initial Question (Resume + Role Context)
    Gemini-->>Back: Return Question Text
    Back->>Gemini: Synthesize Question to Audio (TTS)
    Gemini-->>Back: Return Base64 Audio
    Back->>DB: Save New Session State
    Back-->>Front: Return Question Text + Audio Data
    Front->>User: Play Audio & Render Question Text

    loop For each Question (typically 5 rounds)
        User->>Front: Records or Types Answer Response
        Front->>Back: Post /api/interviews/respond (User Answer)
        Back->>Gemini: Evaluate Answer (Tech accuracy, grammar, poise)
        Gemini-->>Back: Return Feedback & Scores (JSON)
        Back->>Gemini: Request Next Question or Finish
        Gemini-->>Back: Return Next Question (or completion flag)
        Back->>Gemini: Synthesize Next Question to Audio
        Gemini-->>Back: Return Base64 Audio
        Back->>DB: Update Session State & Scores
        Back-->>Front: Return Feedback, Next Question & Audio
        Front->>User: Display Feedback, Play Next Question Audio
    end

    User->>Front: View Final Performance Report & AI Insights
    Front->>DB: Fetch Session History & Trend Data
    DB-->>Front: Return Updated Heatmap & Performance Stats
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite 6 | Rapid, modular UI rendering and bundle compilation |
| **Styling** | CSS Vanilla, Tailwind CSS v4 | Harmonious, responsive layouts and premium dark gradients |
| **Animation** | Motion (Framer Motion) | Micro-interactions, slide transitions, and interactive components |
| **Data Viz** | Recharts | Real-time skill radar charts, scores, and activity heatmaps |
| **Backend API** | Node.js, Express, TSX | Restful routes, session state management, and media streaming |
| **Database** | MongoDB Atlas / Local JSON | Flexible documents for resumes, users, sessions, and leaderboards |
| **AI / TTS Engine** | `@google/genai` (Gemini 2.5 Flash) | AI persona prompts, response evaluation, and audio synthesis |
| **DevOps** | Docker, Docker Compose, Render | Seamless containerization and cloud hosting |

---

## 📖 Feature Walkthrough & System Flow

### 1. User Dashboard & Heatmap Tracking
The landing page displays immediate visual metrics of the user's progress. A timezone-aware calendar activity heatmap visualizes session volume over the past year, while radar charts break down structural skills (grammar, poise, technical explanation, and confidence).

### 2. Tailored Interview Personas
Candidates choose between distinct interviewer styles to practice for different interview settings:
* **Sarah (HR Manager)**: Friendly, conversational tone focused on behavioral cues, speech clarity, and company culture alignment.
* **Alex (Technical Lead)**: Direct, structured, and deep-dives into code accuracy, system design, and technical explanations.

### 3. Smart Resume Contextualization
The platform allows users to upload, clear, and update PDF or text resumes. The backend extracts and embeds resume metrics, dynamically tailoring AI-generated interview questions to match the candidate's actual background and experience.

### 4. Interactive Voice-Based Question Loops
Using the browser's web audio context and Gemini's TTS, questions are spoken to the candidate. The candidate responds using text input or voice recording. The response is graded on:
* **Poise & Tone**: Confidence and phrasing suitability.
* **Grammar**: Structural correctness and fluency.
* **Technical Explanations**: Accuracy, depth, and terminology usage.

---

## 🚀 Local Development Setup

### Prerequisites
* Node.js 20+
* npm
* A MongoDB Atlas Database (or local database)
* A Google Gemini API Key

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/Sabari-D/MockAgent_AI.git
cd MockAgent_AI
npm install
```

### Step 2: Environment Configuration
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/
MONGODB_DB=Mock_Agent
PORT=3000
APP_URL=http://localhost:3000
NODE_ENV=production
```

### Step 3: Run Locally (Dev Mode)
To run with hot-reload for frontend and backend files:
```bash
npm run dev
```

### Step 4: Run Locally (Production Build)
To build and run the optimized production bundle:
```bash
npm run build
npm start
```
Open `http://localhost:3000` in your web browser.

---

## 🐳 Docker Deployment

### Docker Compose
Run both the application and environment in a secure local container:
```bash
docker compose up --build -d
```
To stop the services:
```bash
docker compose down
```

---

## 🌐 Cloud Deployment (Render & Vercel)

### Deploying to Render
1. Push this repository to your GitHub account (`Sabari-D/MockAgent_AI`).
2. Navigate to your [Render Dashboard](https://dashboard.render.com) and create a **Web Service**.
3. Link your GitHub repository.
4. Set the following Build & Runtime parameters:
   * **Runtime**: `Node`
   * **Build Command**: `npm ci && npm run build`
   * **Start Command**: `npm start`
5. Under **Environment Variables**, add:
   * `GEMINI_API_KEY` (Your Gemini API Key)
   * `MONGODB_URI` (Your MongoDB Atlas Connection string)
   * `MONGODB_DB` (Your database name, e.g. `Mock_Agent`)
   * `APP_URL` (Your Render deployment URL)
   * `NODE_ENV` (`production`)
6. Click **Deploy Web Service**.

### Deploying to Vercel (using Docker)
Add a `vercel.json` file in the root:
```json
{
  "version": 3,
  "builds": [
    { "src": "Dockerfile", "use": "@vercel/docker" }
  ]
}
```
Deploy the project via the Vercel dashboard and add the matching environment variables.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
