$ErrorActionPreference = 'Stop'

$source = Join-Path $PSScriptRoot '..\server\api'
$target = 'C:\xampp\htdocs\shoptop-api'

if (-not (Test-Path $source)) {
  throw "Lipseste folderul sursa: $source"
}

New-Item -ItemType Directory -Force -Path $target | Out-Null

Get-ChildItem $source -File | Where-Object { $_.Name -ne 'config.php' } | ForEach-Object {
  Copy-Item $_.FullName -Destination $target -Force
}

Write-Host "API sincronizat in $target (config.php local pastrat)."
