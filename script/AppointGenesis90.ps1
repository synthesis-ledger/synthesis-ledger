# AppointGenesis90.ps1
# Usage: .\AppointGenesis90.ps1
# Prerequisites: peers.txt must exist with one address per line.

# 1. Load Environment Variables
if (Test-Path .env) {
    foreach ($line in Get-Content .env) {
        if ($line -match '^([^#=]+)=(.*)$') {
            $name = $Matches[1].Trim()
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

$TOKEN_ADDR = $env:NEXT_PUBLIC_SYNL_TOKEN_ADDRESS
$RPC_URL = $env:NEXT_PUBLIC_BASE_RPC_URL
$PRIV_KEY = $env:PRIVATE_KEY

if (-not $TOKEN_ADDR -or -not $PRIV_KEY) {
    Write-Error "Missing Token Address or Private Key in .env"
    exit
}

# 2. Load Peer List
if (-not (Test-Path peers.txt)) {
    Write-Host "Creating empty peers.txt. Add addresses there and run again."
    New-Item peers.txt -ItemType File
    exit
}

$peers = Get-Content peers.txt | Where-Object { $_ -match "0x[a-fA-F0-0]{40}" }

Write-Host "--- SEATING THE GENESIS 90 ---"
Write-Host "Found $($peers.Count) peers to appoint."

foreach ($peer in $peers) {
    Write-Host "Appointing $peer..."
    
    # Call the appointKeyFigure function on the Token contract
    # Function signature: appointKeyFigure(address)
    $tx = cast send $TOKEN_ADDR "appointKeyFigure(address)" $peer `
        --rpc-url $RPC_URL `
        --private-key $PRIV_KEY `
        --priority-gas-price 1000000 # 0.001 gwei for Base

    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to appoint $peer"
    } else {
        Write-Host "✅ Success: $peer is now a Key Figure."
    }
}

Write-Host "--- BATCH COMPLETE ---"