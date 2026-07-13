@echo off
setlocal enabledelayedexpansion
title RepoLens Launcher

set "CONFIG_FILE=%APPDATA%\RepoLens\launcher.cfg"
set "RESOLVED_DIR="

:: 1. Try reading from config file
if exist "%CONFIG_FILE%" (
    set /p CACHED_PATH=<"%CONFIG_FILE%"
    call :ValidateFolder "!CACHED_PATH!"
    if "!FOLDER_VALID!"=="1" (
        set "RESOLVED_DIR=!CACHED_PATH!"
    )
)

:: 2. Try current directory of the batch file
if not defined RESOLVED_DIR (
    call :ValidateFolder "%~dp0"
    if "!FOLDER_VALID!"=="1" (
        set "RESOLVED_DIR=%~dp0"
    )
)

:: 3. Try parent directory of the batch file
if not defined RESOLVED_DIR (
    set "PARENT_DIR=%~dp0..\"
    call :ValidateFolder "!PARENT_DIR!"
    if "!FOLDER_VALID!"=="1" (
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
    
    call :ValidateFolder "!USER_PATH!"
    if "!FOLDER_VALID!"=="1" (
        set "RESOLVED_DIR=!USER_PATH!"
        :: Save to config
        if not exist "%APPDATA%\RepoLens" mkdir "%APPDATA%\RepoLens"
        echo !USER_PATH!>"%CONFIG_FILE%"
    ) else (
        echo.
        echo ============================================================
        echo [ERROR] Invalid project folder selected!
        echo ============================================================
        echo Selected Folder: !USER_PATH!
        echo.
        echo Project Validation Checklist:
        echo !DC_STATUS!
        echo !BE_STATUS!
        echo !FE_STATUS!
        echo.
        echo Executed Dir: %~dp0
        echo ============================================================
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
exit /b 0

:: Folder validation subroutine
:ValidateFolder
set "TARGET_DIR=%~1"
set "DC_STATUS=[✘] docker-compose.yml (Missing)"
set "BE_STATUS=[✘] titansearch-backend/ (Missing)"
set "FE_STATUS=[✘] titansearch-frontend/ (Missing)"
set "FOLDER_VALID=1"

if exist "%TARGET_DIR%\docker-compose.yml" (
    set "DC_STATUS=[✔] docker-compose.yml (Found)"
) else (
    set "FOLDER_VALID=0"
)

if exist "%TARGET_DIR%\titansearch-backend\" (
    set "BE_STATUS=[✔] titansearch-backend/ (Found)"
) else (
    set "FOLDER_VALID=0"
)

if exist "%TARGET_DIR%\titansearch-frontend\" (
    set "FE_STATUS=[✔] titansearch-frontend/ (Found)"
) else (
    set "FOLDER_VALID=0"
)
exit /b
