# Technology Stack Signatures Registry

This registry documents how TitanSearch heuristics scan repositories to detect languages, frameworks, databases, and infrastructure.

## Backend Signatures

| Technology | Category | Trigger File | Content Keywords | Default Conf | Matched Conf |
|---|---|---|---|---|---|
| **Spring Boot** | `BACKEND` | `pom.xml`, `build.gradle` | `spring-boot`, `org.springframework.boot` | 0.30 | 0.95 |
| **Node.js / Express** | `BACKEND` | `package.json` | `"express"`, `"koa"`, `"nestjs"` | 0.30 | 0.95 |
| **Django** | `BACKEND` | `requirements.txt`, `pyproject.toml` | `django`, `Django` | 0.30 | 0.95 |
| **Flask** | `BACKEND` | `requirements.txt`, `pyproject.toml` | `flask`, `Flask` | 0.30 | 0.95 |
| **FastAPI** | `BACKEND` | `requirements.txt`, `pyproject.toml` | `fastapi`, `FastAPI` | 0.30 | 0.95 |

## Frontend Signatures

| Technology | Category | Trigger File | Content Keywords | Default Conf | Matched Conf |
|---|---|---|---|---|---|
| **React** | `FRONTEND` | `package.json` | `"react"` | 0.30 | 0.95 |
| **Vue** | `FRONTEND` | `package.json` | `"vue"` | 0.30 | 0.95 |
| **Angular** | `FRONTEND` | `package.json` | `"@angular/core"` | 0.30 | 0.95 |

## Database Signatures

| Technology | Category | Trigger File | Content Keywords | Default Conf | Matched Conf |
|---|---|---|---|---|---|
| **PostgreSQL** | `DATABASE` | `pom.xml`, `package.json`, `requirements.txt` | `postgresql`, `"pg"`, `psycopg` | 0.20 | 0.95 |
| **MySQL** | `DATABASE` | `pom.xml`, `package.json`, `requirements.txt` | `mysql`, `"mysql2"`, `pymysql` | 0.20 | 0.95 |
| **MongoDB** | `DATABASE` | `pom.xml`, `package.json`, `requirements.txt` | `mongodb`, `"mongoose"`, `pymongo` | 0.20 | 0.95 |
| **Redis** | `DATABASE` | `pom.xml`, `package.json`, `requirements.txt` | `redis`, `"ioredis"`, `jedis` | 0.20 | 0.95 |

## Infrastructure Signatures

| Technology | Category | Trigger File | Content Keywords | Default Conf | Matched Conf |
|---|---|---|---|---|---|
| **Docker** | `INFRA` | `docker-compose.yml`, `Dockerfile` | `version`, `services`, `FROM`, `RUN` | 0.80 | 0.95 |
| **Kubernetes** | `INFRA` | `k8s/` folder, `*.yaml` files | `kind: Deployment`, `kind: Service` | 0.90 | 0.95 |

---

## Extension Rules

To add a new signature (e.g. for NestJS or GraphQL):
1. Add a new entry to the `TechSignature` enum inside `com.titansearch.service.analysis.TechSignature.java`.
2. Specify the trigger file name, technology category, technology label name, default confidence, and keywords to search for within the file.
3. If necessary, update this documentation table.
