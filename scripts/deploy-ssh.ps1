<#
  Deploy ShopTop pe serverul DigitalOcean prin SSH (cheia din C:\Users\<tu>\.ssh).

  Rulare (din folderul proiectului):
      npm run deploy              -> build + urca site + API
      npm run deploy:check        -> verifica conexiunea si arata ce s-ar urca, fara sa urce nimic
      npm run deploy:api          -> doar fisierele PHP din shoptop-api (fara build)

  Setari in deploy.local.json (ignorat de git), model in deploy.local.example.json:
      { "mode": "ssh", "host": "164.92.200.248", "user": "root",
        "siteDir": "/var/www/shop-top", "apiDir": "/var/www/shop-top/shoptop-api",
        "siteUrl": "https://shop-top.ro" }

  Siguranta:
   - config.php, uploads/, sessions/, cache/ si keys/ de pe server NU se ating niciodata.
   - Fisierele PHP noi sunt verificate (php -l) pe server INAINTE sa le inlocuiasca pe cele vechi.
   - Inainte de fiecare deploy se pastreaza o copie a codului curent in /root/deploy-backups (ultimele 10).
   - Nu se sterge nimic din site; fisierele vechi din assets/ raman.
   - Migrarile SQL raman manuale; scriptul doar reaminteste.
#>
[CmdletBinding()]
param(
    [ValidateSet('all', 'site', 'api')]
    [string] $Only = 'all',
    [switch] $SkipBuild,
    [switch] $DryRun,
    [string] $ConfigPath
)

$ErrorActionPreference = 'Stop'
$startedAt = Get-Date
$repoRoot = Split-Path -Parent $PSScriptRoot

function Write-Step($text) { Write-Host "`n==> $text" -ForegroundColor Cyan }
function Write-Ok($text) { Write-Host "    $text" -ForegroundColor Green }
function Write-Info($text) { Write-Host "    $text" -ForegroundColor Gray }
function Fail($text) { Write-Host "`nEROARE: $text" -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- configuratie
if (-not $ConfigPath) { $ConfigPath = Join-Path $repoRoot 'deploy.local.json' }
if (-not (Test-Path $ConfigPath)) {
    Fail "Lipseste $ConfigPath. Copiaza deploy.local.example.json in deploy.local.json."
}
try { $cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json }
catch { Fail "deploy.local.json nu e un JSON valid: $($_.Exception.Message)" }
if ($cfg.mode -ne 'ssh') {
    Fail "deploy.local.json nu are ""mode"": ""ssh"". Pentru vechiul hosting cu FTP foloseste: npm run deploy:ftp"
}
foreach ($k in @('host', 'siteDir', 'apiDir')) {
    if (-not $cfg.$k -or [string]::IsNullOrWhiteSpace([string]$cfg.$k)) { Fail "Campul '$k' lipseste din deploy.local.json." }
}
$user = if ($cfg.user) { [string]$cfg.user } else { 'root' }
$target = "$user@$($cfg.host)"
$siteDir = ([string]$cfg.siteDir).TrimEnd('/')
$apiDir = ([string]$cfg.apiDir).TrimEnd('/')
$siteUrl = if ($cfg.siteUrl) { ([string]$cfg.siteUrl).TrimEnd('/') } else { 'https://shop-top.ro' }

$ssh = Join-Path $env:SystemRoot 'System32\OpenSSH\ssh.exe'
$scp = Join-Path $env:SystemRoot 'System32\OpenSSH\scp.exe'
$tar = Join-Path $env:SystemRoot 'System32\tar.exe'
$curl = Join-Path $env:SystemRoot 'System32\curl.exe'
foreach ($t in @($ssh, $scp, $tar)) { if (-not (Test-Path $t)) { Fail "Lipseste $t (OpenSSH / tar din Windows)." } }
$sshOpts = @('-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20')

function Invoke-Remote([string] $command) {
    & $ssh @sshOpts $target $command
    return $LASTEXITCODE
}

Write-Step "Conexiune $target"
$who = & $ssh @sshOpts $target 'hostname'
if ($LASTEXITCODE -ne 0) { Fail "Nu ma pot conecta prin SSH la $target. Verifica cheia SSH si adresa." }
Write-Ok "Conectat la $who."

# --------------------------------------------------------------------- build
if (-not $SkipBuild -and $Only -ne 'api' -and -not $DryRun) {
    Write-Step 'Build frontend (npm run build)'
    $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
    if (-not $npm) {
        $laragonNode = 'C:\laragon\bin\nodejs\node-v22'
        if (Test-Path (Join-Path $laragonNode 'npm.cmd')) {
            $env:Path = $laragonNode + ';' + $env:Path
            $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
        }
    }
    if (-not $npm) { Fail 'npm nu e in PATH. Deschide un terminal cu Node sau ruleaza cu -SkipBuild.' }
    Push-Location $repoRoot
    try {
        & $npm.Source run build
        if ($LASTEXITCODE -ne 0) { Fail 'Build-ul a esuat. Nu urc nimic.' }
    } finally { Pop-Location }
    Write-Ok 'Build gata.'
}

# ------------------------------------------------------- pachetele de trimis
$stage = Join-Path ([System.IO.Path]::GetTempPath()) ('shoptop-deploy-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
$remoteTmp = '/root/deploy-tmp'
$files = @()
try {
    if ($Only -eq 'all' -or $Only -eq 'api') {
        $api = Join-Path $repoRoot 'server\api'
        $apiFiles = Get-ChildItem $api -File | Where-Object {
            $_.Name -ne 'config.php' -and ($_.Extension -eq '.php' -or $_.Name -eq '.htaccess')
        }
        if ($apiFiles.Count -eq 0) { Fail 'Nu gasesc fisiere PHP in server/api.' }
        $names = [string[]]($apiFiles | ForEach-Object { $_.Name })
        & $tar -czf (Join-Path $stage 'api.tgz') -C $api @names
        if ($LASTEXITCODE -ne 0) { Fail 'Nu am putut impacheta API-ul.' }
        $files += 'api.tgz'
        Write-Info ("API: {0} fisiere PHP (fara config.php)." -f $apiFiles.Count)
    }
    if ($Only -eq 'all' -or $Only -eq 'site') {
        $dist = Join-Path $repoRoot 'dist'
        if (-not (Test-Path (Join-Path $dist 'index.html'))) { Fail 'Lipseste dist/index.html. Ruleaza fara -SkipBuild.' }
        & $tar -czf (Join-Path $stage 'site.tgz') -C $dist --exclude=index.html .
        if ($LASTEXITCODE -ne 0) { Fail 'Nu am putut impacheta site-ul.' }
        Copy-Item (Join-Path $dist 'index.html') (Join-Path $stage 'index.html')
        $files += @('site.tgz', 'index.html')
        $n = (Get-ChildItem $dist -Recurse -File).Count
        Write-Info ("Site: {0} fisiere din dist/." -f $n)
    }

    if ($DryRun) {
        Write-Step 'Dry-run'
        Write-Info "S-ar urca: $($files -join ', ') in $siteDir si $apiDir. Nu am urcat nimic."
        exit 0
    }

    # ---------------------------------------------------------------- upload
    Write-Step 'Urc pachetele'
    if ((Invoke-Remote "rm -rf $remoteTmp && mkdir -p $remoteTmp") -ne 0) { Fail 'Nu pot pregati folderul temporar pe server.' }
    $paths = @($files | ForEach-Object { Join-Path $stage $_ })
    & $scp @sshOpts -q @paths "${target}:$remoteTmp/"
    if ($LASTEXITCODE -ne 0) { Fail 'Upload-ul prin scp a esuat. Nimic nu a fost schimbat pe server.' }
    Write-Ok 'Pachete urcate.'

    # ------------------------------------------------- aplicare pe server
    Write-Step 'Aplic pe server'
    $remote = @"
set -e
T=$remoteTmp; SITE=$siteDir; API=$apiDir
STAMP=`$(date +%Y%m%d-%H%M%S)
mkdir -p /root/deploy-backups
tar -czf /root/deploy-backups/cod-`$STAMP.tgz -C `$SITE --exclude=./shoptop-api/uploads --exclude=./shoptop-api/sessions --exclude=./shoptop-api/cache --exclude=./shoptop-api/keys --exclude=./shoptop-api/config.php . 2>/dev/null || true
ls -1t /root/deploy-backups/cod-*.tgz | tail -n +11 | xargs -r rm -f
if [ -f `$T/api.tgz ]; then
  mkdir -p `$T/api && tar --warning=no-unknown-keyword -xzf `$T/api.tgz -C `$T/api
  BAD=0; for f in `$T/api/*.php; do php -l "`$f" >/dev/null 2>&1 || { echo "SINTAXA GRESITA: `$(basename `$f)"; BAD=1; }; done
  [ `$BAD -eq 0 ] || { echo 'Oprit: niciun fisier PHP nu a fost inlocuit.'; exit 3; }
  rm -f `$T/api/config.php
  cp -f `$T/api/* `$T/api/.htaccess `$API/ 2>/dev/null || cp -f `$T/api/* `$API/
  echo "API: `$(ls `$T/api | wc -l) fisiere inlocuite"
fi
if [ -f `$T/site.tgz ]; then
  tar --warning=no-unknown-keyword --no-same-owner -xzf `$T/site.tgz -C `$SITE
  cp -f `$T/index.html `$SITE/index.html
  echo 'Site: assets + index.html actualizate'
fi
chown -R root:root `$SITE/assets `$SITE/index.html 2>/dev/null || true
rm -rf `$T
echo "Backup cod vechi: /root/deploy-backups/cod-`$STAMP.tgz"
"@
    # Scriptul merge ca fisier (ASCII, LF, fara BOM): trimis prin pipe, PowerShell 5.1 ii adauga un BOM.
    $applyLocal = Join-Path $stage 'apply.sh'
    [System.IO.File]::WriteAllText($applyLocal, ($remote -replace "`r", ''), (New-Object System.Text.ASCIIEncoding))
    & $scp @sshOpts -q $applyLocal "${target}:/root/deploy-apply.sh"
    if ($LASTEXITCODE -ne 0) { Fail 'Nu am putut urca pasii de aplicare. Nimic nu a fost schimbat pe server.' }
    & $ssh @sshOpts $target 'bash /root/deploy-apply.sh; RC=$?; rm -f /root/deploy-apply.sh; exit $RC'
    if ($LASTEXITCODE -ne 0) { Fail 'Aplicarea pe server a esuat (vezi mesajele de mai sus).' }

    # ------------------------------------------------------- verificare
    if ($files -contains 'site.tgz' -and (Test-Path $curl)) {
        $main = Get-ChildItem (Join-Path $repoRoot 'dist\assets') -Filter 'index-*.js' -File |
            Where-Object { $_.Name -notlike '*legacy*' } | Select-Object -First 1
        if ($main) {
            $code = & $curl '-s' '--connect-timeout' '20' '-o' 'NUL' '-w' '%{http_code}' '-I' "$siteUrl/assets/$($main.Name)"
            if ($code -eq '200') { Write-Ok "Verificat: $siteUrl serveste versiunea noua." }
            elseif ($code -eq '000') { Write-Info "Nu am putut verifica $siteUrl de pe acest calculator (DNS sau certificat). Deschide site-ul in browser." }
            else { Write-Host "    Atentie: $siteUrl/assets/$($main.Name) raspunde cu $code." -ForegroundColor Yellow }
        }
    }
} finally {
    Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
}

$sec = [int]((Get-Date) - $startedAt).TotalSeconds
Write-Step "Gata in $sec secunde"
Write-Host 'Daca versiunea asta cere o migrare SQL (vezi DEPLOY.md), spune-i lui Claude sau ruleaz-o pe server.' -ForegroundColor Yellow
Write-Host 'Verificare rapida: deschide https://shop-top.ro/ si apasa Ctrl+F5.' -ForegroundColor Yellow
