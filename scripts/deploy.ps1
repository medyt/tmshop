<#
  Deploy ShopTop fara FileZilla: face build-ul si urca prin FTPS doar fisierele schimbate.

  Rulare (din folderul proiectului):
      npm run deploy              -> build + upload site + API
      npm run deploy:check        -> arata ce s-ar urca, fara sa urce nimic
      powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -Only api
      powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -SkipBuild
      powershell -ExecutionPolicy Bypass -File scripts/deploy.ps1 -Force   (re-urca tot)

  Datele de conectare stau in deploy.local.json (langa package.json), fisier ignorat de git.
  Model: deploy.local.example.json.

  Reguli de siguranta:
   - config.php, uploads/, sessions/, cache/ si keys/ de pe server NU se ating niciodata.
   - Nu se sterge nimic de pe server; fisierele vechi din assets/ raman.
   - Migrarile SQL raman manuale (phpMyAdmin), scriptul doar reaminteste.
#>
[CmdletBinding()]
param(
    [ValidateSet('all', 'site', 'api')]
    [string] $Only = 'all',
    [switch] $SkipBuild,
    [switch] $Force,
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
    Fail ("Lipseste $ConfigPath. Copiaza deploy.local.example.json in deploy.local.json " +
          "si completeaza datele de FTP din cPanel.")
}
try { $cfg = Get-Content $ConfigPath -Raw -Encoding UTF8 | ConvertFrom-Json }
catch { Fail "deploy.local.json nu e un JSON valid: $($_.Exception.Message)" }

foreach ($k in @('host', 'user', 'password', 'siteDir', 'apiDir')) {
    if (-not $cfg.$k -or [string]::IsNullOrWhiteSpace([string]$cfg.$k)) {
        Fail "Campul '$k' lipseste din deploy.local.json."
    }
}
$protocol = if ($cfg.protocol) { [string]$cfg.protocol } else { 'ftps' }
if ($protocol -ne 'ftps' -and $protocol -ne 'ftp') { Fail "protocol trebuie sa fie 'ftps' sau 'ftp'." }
if ($protocol -eq 'ftp') {
    Write-Host "ATENTIE: protocol 'ftp' trimite parola necriptat. Foloseste 'ftps'." -ForegroundColor Yellow
}

$curl = Join-Path $env:SystemRoot 'System32\curl.exe'
if (-not (Test-Path $curl)) { Fail "Nu gasesc curl.exe ($curl). E nevoie de Windows 10 sau mai nou." }

function Get-RemoteBase([string] $dir) {
    $d = ('/' + $dir.Trim()).Replace('\', '/')
    while ($d.Contains('//')) { $d = $d.Replace('//', '/') }
    return ('ftp://' + $cfg.host + $d.TrimEnd('/'))
}
$siteBase = Get-RemoteBase ([string]$cfg.siteDir)
$apiBase = Get-RemoteBase ([string]$cfg.apiDir)

# --------------------------------------------------------------------- build
if (-not $SkipBuild -and $Only -ne 'api') {
    Write-Step 'Build frontend (npm run build)'
    $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
    if (-not $npm) {
        $laragonNode = 'C:\laragon\bin\nodejs\node-v22'
        if (Test-Path (Join-Path $laragonNode 'npm.cmd')) {
            $env:Path = $laragonNode + ';' + $env:Path
            $npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
        }
    }
    if (-not $npm) { Fail "npm nu e in PATH. Deschide un terminal cu Node sau ruleaza cu -SkipBuild." }
    Push-Location $repoRoot
    try {
        & $npm.Source run build
        if ($LASTEXITCODE -ne 0) { Fail 'Build-ul a esuat. Nu urc nimic.' }
    } finally { Pop-Location }
    Write-Ok 'Build gata.'
} elseif ($Only -ne 'api') {
    Write-Info 'Build sarit (-SkipBuild): urc ce e deja in dist/.'
}

# ------------------------------------------------------- fisierele de trimis
function Get-SiteFiles {
    $dist = Join-Path $repoRoot 'dist'
    if (-not (Test-Path $dist)) { Fail "Lipseste folderul dist/. Ruleaza fara -SkipBuild." }
    $files = @()
    foreach ($f in Get-ChildItem $dist -Recurse -File) {
        $rel = $f.FullName.Substring($dist.Length + 1).Replace('\', '/')
        if ($rel -eq '.deploy-manifest.json') { continue }
        $files += [pscustomobject]@{ Local = $f.FullName; Remote = $rel; Size = $f.Length }
    }
    # index.html la final: intai codul nou, apoi pagina care il cere.
    return $files | Sort-Object @{ Expression = { $_.Remote -eq 'index.html' } }, Remote
}

function Get-ApiFiles {
    $api = Join-Path $repoRoot 'server\api'
    if (-not (Test-Path $api)) { Fail 'Lipseste server/api.' }
    $files = @()
    # Doar fisierele din radacina server/api: .php si .htaccess.
    # Subfolderele (uploads, sessions, cache, keys) sunt date de pe server, nu cod.
    foreach ($f in Get-ChildItem $api -File) {
        if ($f.Name -eq 'config.php') { continue }            # secretele raman pe server
        if ($f.Extension -ne '.php' -and $f.Name -ne '.htaccess') { continue }
        $files += [pscustomobject]@{ Local = $f.FullName; Remote = $f.Name; Size = $f.Length }
    }
    return $files | Sort-Object Remote
}

# ------------------------------------------------------------ curl / manifest
$netrc = [System.IO.Path]::GetTempFileName()
Set-Content -Path $netrc -Encoding ASCII -Value ("machine {0} login {1} password {2}" -f $cfg.host, $cfg.user, $cfg.password)

function Get-CurlArgs([switch] $Quiet) {
    # -s: fara mesaj de eroare (prima rulare nu are manifest pe server, e normal).
    if ($Quiet) { $a = @('-s') } else { $a = @('-sS') }
    $a += @('--netrc-file', $netrc, '--connect-timeout', '25', '--max-time', '600')
    if ($protocol -eq 'ftps') { $a += '--ssl-reqd' }
    if ($cfg.allowInvalidCert -eq $true) { $a += '-k' }
    return $a
}

function Get-RemoteManifest([string] $base) {
    if ($Force) { return @{} }
    $tmp = [System.IO.Path]::GetTempFileName()
    try {
        & $curl (Get-CurlArgs -Quiet) '--fail' '-o' $tmp "$base/.deploy-manifest.json" | Out-Null
        if ($LASTEXITCODE -ne 0) { return @{} }
        $raw = Get-Content $tmp -Raw -Encoding UTF8
        if ([string]::IsNullOrWhiteSpace($raw)) { return @{} }
        $obj = $raw | ConvertFrom-Json
        $map = @{}
        foreach ($p in $obj.PSObject.Properties) { $map[$p.Name] = [string]$p.Value }
        return $map
    } catch { return @{} }
    finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
}

function Send-File($file, [string] $base) {
    & $curl (Get-CurlArgs) '--fail' '--ftp-create-dirs' '-T' $file.Local "$base/$($file.Remote)" | Out-Null
    return ($LASTEXITCODE -eq 0)
}

function Send-Manifest([hashtable] $map, [string] $base) {
    $tmp = [System.IO.Path]::GetTempFileName()
    try {
        ($map | ConvertTo-Json -Depth 3) | Set-Content -Path $tmp -Encoding UTF8
        & $curl (Get-CurlArgs) '--fail' '-T' $tmp "$base/.deploy-manifest.json" | Out-Null
        return ($LASTEXITCODE -eq 0)
    } finally { Remove-Item $tmp -Force -ErrorAction SilentlyContinue }
}

function Publish-Target([string] $label, $files, [string] $base) {
    Write-Step "$label -> $base"
    if (-not $files -or $files.Count -eq 0) { Write-Info 'Niciun fisier.'; return 0 }

    $remote = Get-RemoteManifest $base
    $changed = @()
    $manifest = @{}
    foreach ($f in $files) {
        $hash = (Get-FileHash -Path $f.Local -Algorithm SHA256).Hash
        $manifest[$f.Remote] = $hash
        if ($Force -or -not $remote.ContainsKey($f.Remote) -or $remote[$f.Remote] -ne $hash) { $changed += $f }
    }
    Write-Info ("{0} fisiere verificate, {1} de urcat." -f $files.Count, $changed.Count)
    if ($changed.Count -eq 0) { Write-Ok 'Serverul e la zi.'; return 0 }

    if ($DryRun) {
        foreach ($f in $changed) { Write-Host ("    [dry-run] {0} ({1:N0} KB)" -f $f.Remote, ($f.Size / 1KB)) }
        return $changed.Count
    }

    $failed = @()
    foreach ($f in $changed) {
        Write-Host ("    urc {0} ({1:N0} KB)" -f $f.Remote, ($f.Size / 1KB)) -NoNewline
        if (Send-File $f $base) { Write-Host ' OK' -ForegroundColor Green }
        else { Write-Host ' ESUAT' -ForegroundColor Red; $failed += $f.Remote }
    }
    if ($failed.Count -gt 0) {
        Write-Host ("    Nu s-au urcat: {0}" -f ($failed -join ', ')) -ForegroundColor Red
        Write-Host '    Manifestul NU a fost actualizat; ruleaza din nou ca sa reincerce.' -ForegroundColor Yellow
        return -1
    }
    if (Send-Manifest $manifest $base) { Write-Ok ("{0} fisiere urcate." -f $changed.Count) }
    else { Write-Host '    Fisierele au ajuns, dar manifestul nu s-a putut scrie (data viitoare re-urca tot).' -ForegroundColor Yellow }
    return $changed.Count
}

# ------------------------------------------------- verificare dupa publicare
function Test-LiveSite {
    $siteUrl = if ($cfg.siteUrl) { ([string]$cfg.siteUrl).TrimEnd('/') } else { 'https://shop-top.ro' }
    $main = Get-ChildItem (Join-Path $repoRoot 'dist\assets') -Filter 'index-*.js' -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notlike '*legacy*' } | Select-Object -First 1
    if (-not $main) { return }
    $url = "$siteUrl/assets/$($main.Name)"
    $code = & $curl '-sS' '--connect-timeout' '20' '-o' 'NUL' '-w' '%{http_code}' '-I' $url
    if ($code -eq '200') { Write-Ok "Verificat: $url raspunde de pe server." }
    else { Write-Host "    Atentie: $url raspunde cu $code. Verifica daca siteDir e folderul corect." -ForegroundColor Yellow }
}

# ------------------------------------------------------------------- executie
$siteChanged = 0
$apiChanged = 0
$hadError = $false
try {
    if ($Only -eq 'all' -or $Only -eq 'api') {
        $r = Publish-Target 'API (shoptop-api)' (Get-ApiFiles) $apiBase
        if ($r -lt 0) { $hadError = $true } else { $apiChanged = $r }
    }
    if ($Only -eq 'all' -or $Only -eq 'site') {
        $r = Publish-Target 'Site (index.html + assets)' (Get-SiteFiles) $siteBase
        if ($r -lt 0) { $hadError = $true } else { $siteChanged = $r }
        if (-not $DryRun -and $r -gt 0) { Test-LiveSite }
    }
} finally {
    Remove-Item $netrc -Force -ErrorAction SilentlyContinue
}

$sec = [int]((Get-Date) - $startedAt).TotalSeconds
Write-Step 'Gata'
Write-Info ("API: {0} fisiere, Site: {1} fisiere, {2} secunde." -f $apiChanged, $siteChanged, $sec)
if ($DryRun) { Write-Info 'Dry-run: nu s-a urcat nimic.' }
if ($hadError) { Fail 'Unele fisiere nu s-au urcat. Vezi mai sus.' }
if (-not $DryRun -and ($apiChanged -gt 0 -or $siteChanged -gt 0)) {
    Write-Host ''
    Write-Host 'Daca versiunea asta cere o migrare SQL (vezi DEPLOY.md), ruleaz-o in phpMyAdmin.' -ForegroundColor Yellow
    Write-Host 'Verificare rapida: deschide https://shop-top.ro/ si apasa Ctrl+F5.' -ForegroundColor Yellow
}
