# RepoLens (TitanSearch)

RepoLens is a high-fidelity repository analysis platform that automatically scans, evaluates, and indexes GitHub repositories. It detects technologies, calculates comprehensive health indexes, draws modular SVGs representing system component architectures, and utilizes Gemini AI to generate structural summaries and map the project's recruiter-facing value.

---

## 🚀 Key Features

- **🔍 Smart Repository Search**: Query index databases filtered by primary languages, stars, and keywords.
- **🏷️ Heuristic Tech Stack Detection**: Automatically parses configurations (e.g. Maven pom, package JSON) to categorize Frontend, Backend, Database, and Infrastructure components.
- **📈 Quality Health Score**: Measures repository maturity, documentation, popularity, commit frequency, and open issue density.
- **🧬 SVG Architecture Flowcharts**: Draws interactive client-server diagrams outlining database routing paths.
- **🤖 Gemini AI Summaries**: Provides functional overviews, architectural layouts, and key learning takeaways.
- **💼 Resume Relevance Mapping**: Evaluates codebase quality and maps developer strengths, weaknesses, and industry fit.
- **🔒 Security & Performance**: Secure JWT token authorization, BCrypt credentials, Redis-backed rate limiting (Bucket4j), and resilience circuit breakers.

---

## 🛠️ Tech Stack

### Backend
- **Core**: Spring Boot 3.3.2, Java 21, Spring Security (JWT)
- **Data & Migration**: JPA Hibernate, PostgreSQL, Flyway migrations
- **AI Integrations**: Gemini API, Resilience4j (Circuit Breakers & Retries), Async processing
- **Performance**: Redis cache wrapper, Bucket4j rate limiting

### Frontend
- **Framework**: React 18, TypeScript, Vite
- **Styling**: Modern, premium Vanilla CSS theme (dark slate background, glowing borders, custom glassmorphism)
- **Icons**: Lucide React
- **Routing**: React Router DOM v6

---

## 📦 Container Setup & Local Deployment

RepoLens is dockerized and ready to deploy with single-command orchestration:

### Prerequisites
Before running, configure your API credentials as environment variables:
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

### Run with Docker Compose
From the root workspace directory, run:
```bash
docker compose up --build -d
```

Once started:
- **React Frontend**: Access at [http://localhost:3000](http://localhost:3000)
- **Backend API Server**: Access at [http://localhost:8080](http://localhost:8080)
- **PostgreSQL Database**: Port `5432`
- **Redis Cache**: Port `6379`

---

## 🧪 Local Testing

### Backend Unit Tests
Compile the codebase and execute the Spring unit tests:
```bash
cd titansearch-backend
mvn clean test "-Dtest=AuthServiceTest,RepositorySearchControllerTest"
```

### Frontend Production Build
Validate TypeScript compile compliance and build static bundle artifacts:
```bash
cd titansearch-frontend
npm install
npm run build
```
