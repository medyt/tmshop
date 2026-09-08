param(
  [string]$Dest = "C:\xampp\htdocs\shoptop-api"
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$source = Resolve-Path (Join-Path $repoRoot "server\api")

Write-Host "Sync API"
Write-Host "  Source: $source"
Write-Host "  Dest:   $Dest"

New-Item -ItemType Directory -Force -Path $Dest | Out-Null

# Copiază tot API-ul, inclusiv subfolderele (uploads/.htaccess), dar NU suprascrie config.php (secret).
$null = robocopy $source $Dest /E /R:1 /W:1 /XF "config.php" /NFL /NDL /NJH /NJS /NP

# Robocopy return codes: 0..7 = ok, >=8 = error.
if ($LASTEXITCODE -ge 8) {
  throw "Robocopy failed with exit code $LASTEXITCODE"
}

# Dacă nu există config.php în dest, creează unul din exemplu.
$destConfig = Join-Path $Dest "config.php"
if (!(Test-Path $destConfig)) {
  Copy-Item -Path (Join-Path $source "config.example.php") -Destination $destConfig
  Write-Host "Created config.php from config.example.php"
} else {
  Write-Host "Kept existing config.php"
}

Write-Host "Done."
