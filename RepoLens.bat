@echo off
title RepoLens Launcher
echo Checking if Docker is running...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please launch Docker Desktop and try again.
    pause
    exit /b 1
)

echo Starting RepoLens services via Docker Compose...
docker compose up -d
if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services.
    pause
    exit /b 1
)

echo Waiting for services to initialize...
timeout /t 3 >nul

echo Opening browser...
start http://localhost:3000
echo RepoLens is running at http://localhost:3000
