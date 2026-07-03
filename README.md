# RepoLens — AI-Powered Repository Intelligence Platform

> **Project Motto**: *RepoLens helps developers discover, analyze, compare, understand, and evaluate software repositories. GitHub Search only finds repositories; RepoLens explains them.*

---

## 🌟 Key Features

RepoLens goes beyond traditional search by deep-crawling repository structures to provide deterministic insights combined with LLM analysis:

1. **Deterministic Tech Stack Detection**: Crawls file trees to identify languages, frameworks (Spring Boot, Django, Node, etc.), databases, and infrastructure (Docker, Kubernetes) with confidence ratings.
2. **Repository Health Scoring**: A multi-dimensional algorithm calculating documentation completeness, recent commit activity, open issues ratios, popularity, and codebase maturity.
3. **Layered System Architecture Inference**: Infers system topology configurations (Monolith, Static+API, Microservice+Cache) and generates interactive SVG graphs.
4. **AI-Enriched Summaries**: Invokes Google Gemini 1.5 Flash to write structured project overviews, core purposes, architecture blueprints, and educational takeaways.
5. **Resume Career Evaluation**: Evaluates codebase complexity, assigns a career rating out of 10.0, and outlines strengths, weaknesses, and concrete improvements.
6. **Jaccard Similarity Engine**: Finds similar repositories in the database by comparing overlapping topic categories and technology signatures.
7. **Rate Limiting & Security**: Enforces Bucket4j rate limiting (60/min anonymous, 300/min authenticated) and stateless JWT security filters.

---

## 🛠️ Technology Stack

* **Backend**: Java 21, Spring Boot 3.3.2, Spring Data JPA, Spring Security, Spring Actuator, Flyway.
* **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand, Vite.
* **Database & Caching**: PostgreSQL 16 (persistent store), Redis 7 (cache-aside and job status tracking).
* **AI Engine**: Google Gemini 1.5 Flash API (via Spring RestClient).
* **DevOps & Observability**: Docker, Docker Compose, Nginx, Prometheus, Grafana.

---

## 📂 Project Structure

```text
RepoLens/
├── docker-compose.yml             # Global container orchestrator
├── prometheus.yml                 # Metrics scraping config
├── nginx.conf                     # Nginx proxy mapping routes
├── README.md                      # Platform documentation
├── RepoLens_Complete_PRD.md       # Product Requirements Document
├── repolens-backend/           # Java Spring Boot API Project
│   ├── Dockerfile
│   ├── pom.xml
│   ├── src/main/resources/
│   │   ├── application.yml        # Configuration profiles
│   │   └── db/migration/          # SQL Flyway schema versions
│   └── src/main/java/             # Source files (controllers, services, entities)
└── repolens-frontend/          # React Single Page Application
    ├── Dockerfile
    ├── package.json
    ├── tailwind.config.js
    ├── nginx.conf
    └── src/                       # Components, Pages, Stores, Hooks
```

---

## ⚙️ Prerequisites & Environment Setup

Ensure you have the following environment variables configured:
* **`GEMINI_API_KEY`** *(Required)*: Your API key from Google AI Studio.
* **`GITHUB_TOKEN`** *(Optional)*: A Personal Access Token (PAT) from GitHub to increase rate limits for recursive tree scans.
* **`JWT_SECRET`** *(Optional)*: Encryption secret used to sign stateless auth tokens.

---

## 🚀 Quick Start Deployment

### 1. Run the Entire Stack (Docker)
The easiest way to run RepoLens end-to-end is using Docker Compose.

```bash
# Set your Gemini key
export GEMINI_API_KEY="your-gemini-key"

# Spin up database, cache, backend, frontend, and monitoring containers
docker-compose up --build
```
Access the application on:
* **Frontend Dashboard**: [http://localhost](http://localhost) (Port 80)
* **Backend REST APIs**: [http://localhost:8080](http://localhost:8080)
* **Prometheus Metrics**: [http://localhost:9090](http://localhost:9090)
* **Grafana Dashboards**: [http://localhost:3000](http://localhost:3000)

---

## 🔗 Key API Routes

All backend routes are prefixed with `/api/v1`:

| Method | Route | Auth | Description | Cache TTL |
|---|---|---|---|---|
| **POST** | `/auth/register` | Public | Register new user account | None |
| **POST** | `/auth/login` | Public | Login and retrieve JWT token | None |
| **GET** | `/repositories/search?q={query}`| Public | Query GitHub and index repository | 5 Min |
| **GET** | `/repositories/{owner}/{repo}/tech-stack` | Public | Get framework signatures | 24 Hours |
| **GET** | `/repositories/{owner}/{repo}/health-score` | Public | Calculate health breakdown metrics | 6 Hours |
| **GET** | `/repositories/{owner}/{repo}/architecture` | Public | Generate SVG nodes and edges layout | 24 Hours |
| **GET** | `/repositories/{owner}/{repo}/ai-summary` | User | Get or trigger async Gemini summary | 24 Hours |
| **POST** | `/repositories/{owner}/{repo}/resume-analysis`| User | Trigger career evaluation review | 24 Hours |
| **GET** | `/repositories/{owner}/{repo}/similar` | Public | Query Jaccard recommendation list | 24 Hours |
