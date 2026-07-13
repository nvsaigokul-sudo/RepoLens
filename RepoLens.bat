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

:: 3. Try scanning subdirectories 1 level deep inside the batch directory
if not defined RESOLVED_DIR (
    for /d %%d in ("%~dp0*") do (
        if not defined RESOLVED_DIR (
            call :ValidateFolder "%%d"
            if "!FOLDER_VALID!"=="1" (
                set "RESOLVED_DIR=%%d"
                echo Auto-detected project folder at: "%%d"
            )
        )
    )
)

:: 4. Try parent directory of the batch file
if not defined RESOLVED_DIR (
    set "PARENT_DIR=%~dp0..\"
    call :ValidateFolder "!PARENT_DIR!"
    if "!FOLDER_VALID!"=="1" (
        set "RESOLVED_DIR=!PARENT_DIR!"
    )
)

:: 5. Check if the default workspace already exists and contains a valid project
if not defined RESOLVED_DIR (
    set "DEFAULT_WORKSPACE=%USERPROFILE%\RepoLens-Workspace"
    set "DEFAULT_PROJECT_ROOT=!DEFAULT_WORKSPACE!\RepoLens-main"
    call :ValidateFolder "!DEFAULT_PROJECT_ROOT!"
    if "!FOLDER_VALID!"=="1" (
        set "RESOLVED_DIR=!DEFAULT_PROJECT_ROOT!"
        if not exist "%APPDATA%\RepoLens" mkdir "%APPDATA%\RepoLens"
        echo !DEFAULT_PROJECT_ROOT!>"%CONFIG_FILE%"
    )
)

:: 6. First-Time Setup Fallback: Automatically download, extract, and start services
if not defined RESOLVED_DIR (
    set "DEFAULT_WORKSPACE=%USERPROFILE%\RepoLens-Workspace"
    set "DEFAULT_PROJECT_ROOT=!DEFAULT_WORKSPACE!\RepoLens-main"
    
    echo ============================================================
    echo Welcome to RepoLens First-Time Setup!
    echo ============================================================
    echo We are automatically creating your RepoLens workspace at:
    echo "!DEFAULT_WORKSPACE!"
    echo.
    
    echo Checking if Docker is running...
    docker info >nul 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] Docker is not running. Please start Docker Desktop first and try again.
        pause
        exit /b 1
    )
    
    echo Step 1/3: Downloading RepoLens repository from GitHub...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/nvsaigokul-sudo/RepoLens/archive/refs/heads/main.zip' -OutFile '%TEMP%\repolens.zip'"
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to download project resources from GitHub.
        pause
        exit /b 1
    )
    
    echo Step 2/3: Extracting files to workspace...
    if exist "!DEFAULT_WORKSPACE!" rd /s /q "!DEFAULT_WORKSPACE!"
    mkdir "!DEFAULT_WORKSPACE!"
    powershell -Command "Expand-Archive -Path '%TEMP%\repolens.zip' -DestinationPath '!DEFAULT_WORKSPACE!' -Force"
    del /f /q "%TEMP%\repolens.zip"
    
    call :ValidateFolder "!DEFAULT_PROJECT_ROOT!"
    if "!FOLDER_VALID!"=="0" (
        echo [ERROR] Failed to extract project files properly.
        pause
        exit /b 1
    )
    
    echo Step 3/3: Starting Docker containers...
    cd /d "!DEFAULT_PROJECT_ROOT!"
    docker compose up -d
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to start Docker services.
        pause
        exit /b 1
    )
    
    :: Save to configuration file
    if not exist "%APPDATA%\RepoLens" mkdir "%APPDATA%\RepoLens"
    echo !DEFAULT_PROJECT_ROOT!>"%CONFIG_FILE%"
    
    set "RESOLVED_DIR=!DEFAULT_PROJECT_ROOT!"
    echo Setup complete! Launching browser...
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
