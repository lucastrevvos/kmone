# scripts/clean-eas.ps1

Write-Host "Parando Gradle..." -ForegroundColor Cyan

if (Test-Path "android/gradlew.bat") {
  Push-Location android
  .\gradlew.bat --stop
  Pop-Location
}

Write-Host "Limpando caches/builds locais que não devem ir para o EAS..." -ForegroundColor Cyan

$paths = @(
  "android/.gradle",
  "android/build",
  "android/app/build",
  "android/.kotlin",
  "android/app/.cxx",
  ".gradle",
  ".expo",
  ".expo-shared",
  ".metro-cache",
  ".cache",
  "tmp",
  "temp"
)

foreach ($path in $paths) {
  if (Test-Path $path) {
    Write-Host "Removendo $path" -ForegroundColor Yellow
    Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
  }
}

Write-Host "Limpeza concluída." -ForegroundColor Green