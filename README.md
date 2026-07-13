# RepoLens (TitanSearch)

RepoLens is a high-fidelity repository analysis platform that automatically scans, evaluates, and indexes GitHub repositories. It detects technologies, calculates comprehensive health indexes, draws modular SVGs representing system component architectures, and utilizes Gemini AI to generate structural summaries and map the project's recruiter-facing value.

---

## 🚀 Self-Contained Desktop Application (`RepoLens.exe`)

RepoLens is compiled as a professional, self-contained desktop application. All required services, configuration files, front-end assets, and backend runtimes are fully embedded inside the executable binary.

No source code, development environment, or git repositories are required on the user's computer.

### 📥 Download & Launch
1. **Download the Application**: [Click here to download RepoLens.exe](https://github.com/nvsaigokul-sudo/RepoLens/raw/main/RepoLens.exe)
2. **Launch**:
   * Open **Docker Desktop** (required local container runtime).
   * Double-click **`RepoLens.exe`** from any folder (e.g., Downloads, Desktop).
   * The application automatically installs to `%LOCALAPPDATA%\RepoLens`, starts the Postgres, Redis, backend, and frontend containers, and opens your browser at [http://localhost:3000](http://localhost:3000).

> [!IMPORTANT]
> **Setup Credentials**: Make sure your `GITHUB_TOKEN` and `GEMINI_API_KEY` environment variables are set in Windows (Settings -> Environment Variables) or active in your system environment before launching the application.

---

## 🛠️ Developer Mode Launcher (`RepoLens.bat`)

For developers working directly inside the cloned repository workspace, we provide a transparent batch script launcher:
* **Download/Run**: Double-click **`RepoLens.bat`** from the cloned project root folder.
* It checks the development folder structures, starts local services via your workspace `docker-compose.yml`, and opens the browser.

---

## 📁 Repository Structure

```
RepoLens/
├── titansearch-backend/            # Spring Boot 3.3.2 application
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/titansearch/
│   │   │   │   ├── config/         # Rate limiting, Caching, and Security setup
│   │   │   │   ├── controller/     # REST Endpoints
│   │   │   │   ├── dto/            # Request/Response payloads
│   │   │   │   ├── entity/         # JPA database tables
│   │   │   │   ├── repository/     # Postgres query layers
│   │   │   │   ├── security/       # JWT Auth Filters
│   │   │   │   └── service/        # Core business services
│   │   │   └── resources/
│   │   │       ├── db/migration/   # Flyway database schemas
│   │   │       └── application.yml # Environment configurations
│   │   └── test/                   # JUnit mock testing suite
│   ├── Dockerfile
│   └── pom.xml
│
├── titansearch-frontend/           # React 18 SPA
│   ├── src/
│   │   ├── assets/                 # Icons & SVGs
│   │   ├── components/             # Gauge & Diagram visualization modules
│   │   ├── pages/                  # Route layouts
│   │   ├── App.tsx                 # Client routing
│   │   └── index.css               # GitHub Dark stylesheet
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
│
└── docker-compose.yml              # Multi-container orchestration
```

---

## 🛠️ Tech Stack & Key Engines

### Backend Core
- **Framework**: Spring Boot 3.3.2, Java 21, Spring Security (JWT filter chain)
- **Database Layer**: JPA Hibernate ORM, PostgreSQL database, Flyway schema migrations
- **Heuristics & Scan Engines**:
  - **Tech Stack Detector**: Matches signature files (`pom.xml`, `package.json`, `requirements.txt`, etc.) using regex rules to categorize stack elements.
  - **Maturity & Health Calculator**: Evaluates Documentation presence, Pushed Activity, Issue Densities, Stars/Forks counts, and repository age to output an index out of 100.
  - **System Flow Diagram**: Infers Backend, Frontend, Caches, and Database entities and traces connector paths as structured nodes and edges.
- **AI Integrations**:
  - **Gemini Client**: Generates JSON summary reports and recruiter portfolio analyses. Wrapped with **Resilience4j Circuit Breakers** and **Retry policies**.
  - **Asynchronous Processing**: Slowly-executing AI generation steps run on async daemon threads, returning a `202 ACCEPTED` status. The UI polls the endpoint until generation is complete.
- **Recommendations**: Case-insensitive Weighted Jaccard index matching overlapping technologies and repository topics.
- **Performance**: Redis cache wrapper & Bucket4j API rate limiter.

### Frontend Client
- **Framework**: React 18, TypeScript, Vite hot-reload bundler.
- **Styling**: Premium, responsive **GitHub Dark palette** (Obsidian `#0d1117` backgrounds, `#30363d` active borders, link blues, and success greens).
- **Widgets**: Custom radial SVG gauges for health percentages, and layout coordinated SVG path connectors for network routing diagrams.

---

## 📋 REST API Contracts

### 🔐 Authentication
- `POST /api/v1/auth/register` - Create user credentials. Returns JWT.
- `POST /api/v1/auth/login` - Authenticate user credentials. Returns JWT.

### 🔍 Repository Analytics
- `GET /api/v1/repositories/search` - Paginated keyword search filtering by stars and languages.
- `GET /api/v1/repositories/{owner}/{repo}` - Get synced metadata, star metrics, and language breakdowns.
- `POST /api/v1/repositories/{owner}/{repo}/sync` - Trigger a fresh sync from the GitHub REST API.
- `GET /api/v1/repositories/{owner}/{repo}/tech-stack` - Fetch detected tech frameworks.
- `GET /api/v1/repositories/{owner}/{repo}/health-score` - Fetch calculated health percentages and sub-scores.
- `GET /api/v1/repositories/{owner}/{repo}/architecture` - Get inferred system node architecture.
- `GET /api/v1/repositories/{owner}/{repo}/similar` - Get recommended sibling repositories.

### 🤖 AI Summary & Recruiter Rating
- `GET /api/v1/repositories/{owner}/{repo}/ai-summary` - Get functional/architectural summary. Returns `202 PENDING` if compiling.
- `POST /api/v1/ai-summary/regenerate` - Manually trigger an AI update (roles restricted, rate limited).
- `POST /api/v1/repositories/{owner}/{repo}/resume-analysis` - Get recruiter portfolio fit analysis. Returns `202 PENDING` if compiling.

### ⭐️ Saved favorites & search history
- `GET /api/v1/favorites` - Get favorite repositories.
- `POST /api/v1/favorites/{id}` - Add repository to favorites.
- `DELETE /api/v1/favorites/{id}` - Remove repository from favorites.
- `GET /api/v1/history` - Get user search query log.

---

## 📦 Container Setup & Local Deployment

### Configure Environment Variables
Configure your credentials in your current shell session:
```bash
# Windows (PowerShell)
$env:GITHUB_TOKEN="your-github-token"
$env:GEMINI_API_KEY="your-gemini-key"
$env:JWT_SECRET="your-jwt-signing-secret"

# Linux / macOS
export GITHUB_TOKEN="your-github-token"
export GEMINI_API_KEY="your-gemini-key"
export JWT_SECRET="your-jwt-signing-secret"
```

### Option A: Run Full Stack via Docker
Build and orchestrate all services inside Docker containers:
```bash
docker compose up --build -d
```
Once started, access the React client at [http://localhost:3000](http://localhost:3000) and the backend API at [http://localhost:8080](http://localhost:8080).

### Option B: Run Dev Services Locally
If you want hot-reloading active frontends and simple backend console logs:

1. **Launch containerized database and cache dependencies**:
   ```bash
   docker compose up -d postgres redis
   ```
   *Note: Containerized PostgreSQL is mapped to port `5439` to prevent port collisions with native host PostgreSQL services.*

2. **Run Spring Boot Backend**:
   ```bash
   cd titansearch-backend
   mvn spring-boot:run
   ```

3. **Run React Frontend**:
   ```bash
   cd titansearch-frontend
   npm install
   npm run dev
   ```
   Open your browser to [http://localhost:5173](http://localhost:5173).

---

## 🧪 Local Testing

### Backend Unit Tests
Execute JUnit MockMvc controller slices and auth service checks:
```bash
cd titansearch-backend
mvn test "-Dtest=AuthServiceTest,RepositorySearchControllerTest"
```

### Frontend Production Build
Verify TypeScript compliance and package assets:
```bash
cd titansearch-frontend
npm run build
```
