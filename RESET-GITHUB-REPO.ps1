param(
  [string]$RepoPath = ""
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($RepoPath)) {
  $RepoPath = Read-Host "Paste the full path to your local Salt-Swap GitHub repo folder"
}

$RepoPath = (Resolve-Path $RepoPath).Path
$GitDir = Join-Path $RepoPath ".git"

if (-not (Test-Path $GitDir)) {
  Write-Host ""
  Write-Host "ERROR: That folder is not a Git repository (no .git folder found)." -ForegroundColor Red
  Write-Host "Open the repo in GitHub Desktop, then use Repository > Show in Explorer and copy that folder path."
  exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$CleanRoot = Join-Path $ScriptDir "CLEAN-ROOT"

if (-not (Test-Path (Join-Path $CleanRoot "index.html"))) {
  Write-Host "ERROR: CLEAN-ROOT is missing next to this script." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "This will clean the Salt-Swap working tree and replace it with The Trenches V1.11.14." -ForegroundColor Yellow
Write-Host "Git history (.git) will be preserved." -ForegroundColor Yellow
$answer = Read-Host "Type YES to continue"
if ($answer -ne "YES") {
  Write-Host "Cancelled."
  exit 0
}

# Delete everything in the working tree except .git.
Get-ChildItem -LiteralPath $RepoPath -Force | Where-Object { $_.Name -ne ".git" } | Remove-Item -Recurse -Force

# Copy the clean build into the repo root.
Copy-Item -Path (Join-Path $CleanRoot "*") -Destination $RepoPath -Recurse -Force

Push-Location $RepoPath
try {
  git add -A
  git commit -m "Fresh Trenches V1.11.14 repo reset"
  git push origin main
} finally {
  Pop-Location
}

Write-Host ""
Write-Host "DONE." -ForegroundColor Green
Write-Host "Now in Vercel set Root Directory to BLANK and let main deploy."
Write-Host "Then check /api/health. Expected:"
Write-Host '  "version":"1.11.14"'
Write-Host '  "build":"clean-repo-reset"'
