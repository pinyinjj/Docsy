@echo off
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B
)
if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
pushd "%~dp0"

:: Pass file path safely via env variable to prevent quote/terminator parsing errors
set "SCRIPT_PATH=%~f0"
cls
powershell -NoProfile -ExecutionPolicy Bypass -Command "$raw=Get-Content -LiteralPath $env:SCRIPT_PATH -Raw; $idx=$raw.IndexOf('#PS_' + 'START'); Invoke-Expression $raw.Substring($idx)"
pause
exit /b

#PS_START
# Standard foreground coloring works perfectly now that output is pure English
function Write-Green ($msg) {
    Write-Host $msg -ForegroundColor Green
}

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "        Network Priority Configuration Script          " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""

# Fetch active network interfaces safely as an array
$routes = @(Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue)
if (-not $routes) {
    $interfaces = @(Get-NetIPInterface -AddressFamily IPv4 | Where-Object {$_.ConnectionState -eq 'Connected'} | ForEach-Object {
        $cleanName = $_.InterfaceAlias
        if ($cleanName) { $cleanName = $cleanName.Replace('以太网', 'Ethernet').Replace('无线网络', 'Wi-Fi') }
        [PSCustomObject]@{
            Index   = $_.InterfaceIndex
            Name    = $cleanName
            Gateway = "N/A"
        }
    })
} else {
    $interfaces = @($routes | ForEach-Object {
        $alias = (Get-NetIPInterface -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue).InterfaceAlias
        if ($alias) { $alias = $alias.Replace('以太网', 'Ethernet').Replace('无线网络', 'Wi-Fi') }
        [PSCustomObject]@{
            Index   = $_.InterfaceIndex
            Name    = $alias
            Gateway = $_.NextHop
        }
    })
}

# Deduplicate profiles by interface index
$interfaces = @($interfaces | Group-Object Index | ForEach-Object { $_.Group[0] })

if ($interfaces.Count -eq 0) {
    Write-Host "[Error] No active network adapters found!" -ForegroundColor Red
    return
}

# --- STEP 1: Select Internet Adapter ---
Write-Host "--- STEP 1: Select your INTERNET connected adapter ---" -ForegroundColor Yellow
for ($i = 0; $i -lt $interfaces.Count; $i++) {
    Write-Host "[$($i + 1)] Name: $($interfaces[$i].Name) | Gateway: $($interfaces[$i].Gateway)"
}
Write-Host ""

$wanChoice = -1
while ($wanChoice -lt 0 -or $wanChoice -ge $interfaces.Count) {
    $inputWan = Read-Host "Enter the number for your INTERNET adapter"
    if ([int]::TryParse($inputWan, [ref]$wanChoice)) { $wanChoice-- } else { $wanChoice = -1 }
}
$wanAdapter = $interfaces[$wanChoice]
Write-Green ("Selected Primary (Internet): " + $wanAdapter.Name)
Write-Host ""

# --- STEP 2: Select Other Adapter ---
Write-Host "--- STEP 2: Select your SECONDARY (Switch/LAN) adapter ---" -ForegroundColor Yellow
$remainingInterfaces = @($interfaces | Where-Object { $_.Index -ne $wanAdapter.Index })

if ($remainingInterfaces.Count -eq 0) {
    Write-Host "[Info] No other network adapters available to configure." -ForegroundColor Yellow
    $lanAdapter = $null
} elseif ($remainingInterfaces.Count -eq 1) {
    $lanAdapter = $remainingInterfaces[0]
    Write-Green ("Automatically selected the remaining adapter: " + $lanAdapter.Name)
    Write-Host ""
} else {
    for ($i = 0; $i -lt $remainingInterfaces.Count; $i++) {
        Write-Host "[$($i + 1)] Name: $($remainingInterfaces[$i].Name) | Gateway: $($remainingInterfaces[$i].Gateway)"
    }
    Write-Host ""

    $lanChoice = -1
    while ($lanChoice -lt 0 -or $lanChoice -ge $remainingInterfaces.Count) {
        $inputLan = Read-Host "Enter the number for your SECONDARY adapter"
        if ([int]::TryParse($inputLan, [ref]$lanChoice)) { $lanChoice-- } else { $lanChoice = -1 }
    }
    $lanAdapter = $remainingInterfaces[$lanChoice]
    Write-Green ("Selected Secondary (Switch): " + $lanAdapter.Name)
    Write-Host ""
}

# --- Applying Metrics ---
Write-Host "Applying metric modifications..." -ForegroundColor Cyan

# Set Internet adapter to Metric 10 (High Priority)
Set-NetIPInterface -InterfaceIndex $wanAdapter.Index -AddressFamily IPv4 -InterfaceMetric 10 -AutomaticMetric Disabled
Write-Green ("[OK] Set Metric 10 (High Priority) for: " + $wanAdapter.Name)

# Set Switch adapter to Metric 50 (Low Priority)
if ($lanAdapter) {
    Set-NetIPInterface -InterfaceIndex $lanAdapter.Index -AddressFamily IPv4 -InterfaceMetric 50 -AutomaticMetric Disabled
    Write-Green ("[OK] Set Metric 50 (Low Priority) for: " + $lanAdapter.Name)
}

# --- Network Stack Refresh ---
Write-Host ""
Write-Host "Flushing DNS Cache..." -ForegroundColor Cyan
Clear-DnsClientCache -ErrorAction SilentlyContinue

Write-Host "Restarting Tailscale service..." -ForegroundColor Cyan
$tsService = Get-Service -Name "Tailscale" -ErrorAction SilentlyContinue
if ($tsService) {
    Restart-Service -Name "Tailscale" -Force
    Write-Green "[OK] Tailscale service restarted successfully."
} else {
    Write-Host "[Info] Tailscale service not detected on this machine." -ForegroundColor Yellow
}

# --- Awaiting Network Synchronization Loop ---
Write-Host ""
Write-Host "Waiting for Tailscale network synchronization..." -ForegroundColor Cyan

$maxAttempts = 10
for ($i = 1; $i -le $maxAttempts; $i++) {
    Start-Sleep -Seconds 2
    $currentStatus = & tailscale status 2>&1 | Out-String
    
    if ($currentStatus -like "*unexpected state*" -or $currentStatus -like "*is starting*") {
        Write-Host ("Daemon initializing... Retrying status check (" + $i + "/" + $maxAttempts + ")...") -ForegroundColor Yellow
    } else {
        break
    }
}

# --- Live Tailscale Status Output ---
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "            Current Tailscale Network Status           " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
& tailscale status
Write-Host ""