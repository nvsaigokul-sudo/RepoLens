@echo off
setlocal enabledelayedexpansion
title RepoLens Launcher

set "CONFIG_FILE=%APPDATA%\RepoLens\launcher.cfg"
set "RESOLVED_DIR="

:: 1. Try reading from config file
if exist "%CONFIG_FILE%" (
    set /p CACHED_PATH=<"%CONFIG_FILE%"
    if exist "!CACHED_PATH!\docker-compose.yml" (
        set "RESOLVED_DIR=!CACHED_PATH!"
    )
)

:: 2. Try current directory of the batch file
if not defined RESOLVED_DIR (
    if exist "%~dp0docker-compose.yml" (
        set "RESOLVED_DIR=%~dp0"
    )
)

:: 3. Try parent directory of the batch file
if not defined RESOLVED_DIR (
    set "PARENT_DIR=%~dp0..\"
    if exist "!PARENT_DIR!docker-compose.yml" (
        set "RESOLVED_DIR=!PARENT_DIR!"
    )
)

:: 4. Prompt user if still not resolved
if not defined RESOLVED_DIR (
    echo RepoLens project directory was not found automatically.
    echo.
    set /p USER_PATH="Please enter the full path to the RepoLens folder: "
    
    :: Remove quotes if entered by user
    set "USER_PATH=!USER_PATH:"=!"
    
    if exist "!USER_PATH!\docker-compose.yml" (
        set "RESOLVED_DIR=!USER_PATH!"
        :: Save to config
        if not exist "%APPDATA%\RepoLens" mkdir "%APPDATA%\RepoLens"
        echo !USER_PATH!>"%CONFIG_FILE%"
    ) else (
        echo.
        echo [ERROR] The directory "!USER_PATH!" does not contain docker-compose.yml.
        echo.
        echo Executed Dir: %~dp0
        echo Searched paths:
        echo - %~dp0
        echo - %~dp0..
        if exist "%CONFIG_FILE%" echo - Cached: !CACHED_PATH!
        echo.
        pause
        exit /b 1
    )
)

:: Remove trailing slash if any
if "%RESOLVED_DIR:~-1%"=="\" set "RESOLVED_DIR=%RESOLVED_DIR:~0,-1%"

echo Checking if Docker is running...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running. Please launch Docker Desktop and try again.
    pause
    exit /b 1
)

echo Starting RepoLens services via Docker Compose at:
echo "%RESOLVED_DIR%"
echo.
cd /d "%RESOLVED_DIR%"
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
