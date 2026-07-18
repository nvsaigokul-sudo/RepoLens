Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Building RepoLens Self-Contained Launcher" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Ensure launcher-resources folder exists
if (!(Test-Path "launcher-resources")) {
    New-Item -ItemType Directory -Path "launcher-resources" | Out-Null
}

# 2. Build Backend JRE Jar
Write-Host "`n[Step 1/5] Building Spring Boot backend JAR..." -ForegroundColor Yellow
cd titansearch-backend
& "c:\Users\nvsai\Desktop\anti gravity\maven\apache-maven-3.9.6\bin\mvn.cmd" clean package -DskipTests
cd ..

if (!(Test-Path "titansearch-backend\target\titansearch-backend-0.2.0.jar")) {
    Write-Error "Backend compilation failed. JAR not found."
    Exit 1
}
Copy-Item "titansearch-backend\target\titansearch-backend-0.2.0.jar" "launcher-resources\titansearch-backend-0.2.0.jar" -Force

# 3. Build Frontend
Write-Host "`n[Step 2/5] Building React frontend static assets..." -ForegroundColor Yellow
cd titansearch-frontend
npm run build
cd ..

if (!(Test-Path "titansearch-frontend\dist")) {
    Write-Error "Frontend compilation failed. dist directory not found."
    Exit 1
}

# 4. Zip Frontend dist
Write-Host "`n[Step 3/5] Compressing frontend assets to ZIP..." -ForegroundColor Yellow
if (Test-Path "launcher-resources\frontend.zip") {
    Remove-Item "launcher-resources\frontend.zip" -Force
}
Compress-Archive -Path "titansearch-frontend\dist\*" -DestinationPath "launcher-resources\frontend.zip" -Force

# 5. Compile C# Launcher Binary
Write-Host "`n[Step 4/5] Compiling C# launcher into RepoLens.exe..." -ForegroundColor Yellow
& "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" `
  /target:winexe `
  /win32manifest:app.manifest `
  /win32icon:repolens.ico `
  /out:RepoLens.exe `
  /r:System.Windows.Forms.dll `
  /r:System.Drawing.dll `
  /resource:launcher-resources\docker-compose.prod.yml,RepoLens.docker-compose.prod.yml `
  /resource:launcher-resources\nginx.conf,RepoLens.nginx.conf `
  /resource:launcher-resources\titansearch-backend-0.2.0.jar,RepoLens.titansearch-backend-0.2.0.jar `
  /resource:launcher-resources\frontend.zip,RepoLens.frontend.zip `
  RepoLensLauncher.cs AssemblyInfo.cs

if (Test-Path "RepoLens.exe") {
    # Copy to frontend public, dist, and backend static resource paths
    Copy-Item "RepoLens.exe" "titansearch-frontend\public\RepoLens.exe" -Force
    Copy-Item "RepoLens.exe" "titansearch-frontend\dist\RepoLens.exe" -Force
    if (!(Test-Path "titansearch-backend\src\main\resources\static")) {
        New-Item -ItemType Directory -Path "titansearch-backend\src\main\resources\static" | Out-Null
    }
    Copy-Item "RepoLens.exe" "titansearch-backend\src\main\resources\static\RepoLens.exe" -Force

    Write-Host "`n=========================================" -ForegroundColor Green
    Write-Host "SUCCESS: RepoLens.exe generated successfully!" -ForegroundColor Green
    Write-Host "Size: $(((Get-Item .\RepoLens.exe).Length / 1MB).ToString('F2')) MB" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
} else {
    Write-Error "Failed to compile RepoLens.exe"
}
