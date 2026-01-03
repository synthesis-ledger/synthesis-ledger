# AppointGenesis90.ps1 (V42 Standard)
# Purpose: Formally seat the inaugural council and grant forensic strike authority.

# 1. Environment Hardening
if (Test-Path .env) {
    foreach ($line in Get-Content .env) {
        if ($line -match '^([^#=]+)=(.*)$') {
            $name = $Matches[1].Trim()
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

$LEDGER_ADDR = $env:NEXT_PUBLIC_REGISTRY_ADDRESS
$RPC_URL = $env:NEXT_PUBLIC_BASE_RPC_URL
$PRIV_KEY = $env:PRIVATE_KEY

if (-not $LEDGER_ADDR -or -not $PRIV_KEY) {
    Write-Error "[!] CRITICAL: Missing Registry Address or Private Key in .env"
    exit
}

# 2. Load and Sanitize Peer List
if (-not (Test-Path peers.txt)) {
    Write-Host "[!] Creating peers.txt. Add addresses (0x...) and run again."
    New-Item peers.txt -ItemType File
    exit
}

# Regex fix to extract clean addresses even if Discord handles are present
$peers = Get-Content peers.txt | ForEach-Object { 
    if ($_ -match "0x([a-fA-F0-9]{40})") { $Matches[0] } 
}

if ($null -eq $peers) {
    Write-Host "[!] No valid EVM addresses found in peers.txt" -ForegroundColor Red
    exit
}

Write-Host "`n--- SEATING THE GENESIS 90 COUNCIL ---" -ForegroundColor Cyan
Write-Host ">>> Found $($peers.Count) peers to appoint."

# 3. Batch Appointment via Foundry/Cast
$GROWTH_ROLE = "0xbf25d9d300000000000000000000000000000000000000000000000000000000" # keccak256("GROWTH_CONTROLLER_ROLE")

foreach ($peer in $peers) {
    Write-Host "`n>>> [PROCESS] Appointing $peer..." -ForegroundColor Gray
    
    # Signature: grantRole(bytes32 role, address account)
    # Using 'cast send' to execute the transaction on Base Mainnet
    cast send $LEDGER_ADDR "grantRole(bytes32,address)" $GROWTH_ROLE $peer `
        --rpc-url $RPC_URL `
        --private-key $PRIV_KEY `
        --gas-limit 100000

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ [FAILURE] Failed to seat $peer" -ForegroundColor Red
    } else {
        Write-Host "✅ [SUCCESS] $peer is now a seated Growth Controller." -ForegroundColor Green
    }
}

Write-Host "`n--- BATCH COMPLETE: THE COUNCIL IS LIVE ---" -ForegroundColor Cyan