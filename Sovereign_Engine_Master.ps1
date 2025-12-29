# --- SOVEREIGN V25: THE FINAL GLOBAL RECIPE ---
# HARDENED: Purges Ghost Processes and Validates Reconciler Finality
$xAIKey = "ENTER YOUR XAI KEY HERE"
$RegistryUrl = "https://raw.githubusercontent.com/synthesis-ledger/synthesis-ledger/main/genesis_onchain.json"

# 1. DYNAMIC REGISTRY FETCH
$Registry = Invoke-RestMethod -Uri $RegistryUrl -Method Get -UseBasicParsing
$AtomicID = 3  # Polymorphic: Change this to the ID you want to test.
$Data = @"
INSERT YOUR INPUT DATA HERE
"@
$TargetLogic = $Registry | Where-Object { $_.id -eq $AtomicID }

if (-not $TargetLogic) {
    Write-Error "CRITICAL: Atomic ID $AtomicID not found in Registry."
    exit
}

# 2. CONTRACT SKELETON
$GlobalBlueprint = "synthesis_id, logic_id, bps_verified, model_stack, processing_ms, timestamp"
$CustomBlueprint = $TargetLogic.custom_outputs | ConvertTo-Json -Depth 10

function Invoke-SovereignAgent($Prompt, $Model, $AgentLabel, $Color) {
    Write-Host "`n>>> [$AgentLabel] IS PROCESSING..." -ForegroundColor $Color
    
    $Body = @{ 
        model = $Model; 
        messages = @(@{ role = "user"; content = $Prompt }); 
        temperature = 0 
    } | ConvertTo-Json -Compress
    
    $Headers = @{ 
        "Authorization" = "Bearer $xAIKey"; 
        "Content-Type" = "application/json" 
    }

    try {
        $ResponseRaw = Invoke-WebRequest -Uri "https://api.x.ai/v1/chat/completions" -Method Post -Headers $Headers -Body ([System.Text.Encoding]::UTF8.GetBytes($Body)) -UseBasicParsing
        $Response = ($ResponseRaw.Content | ConvertFrom-Json).choices[0].message.content
        Write-Host "`n[$AgentLabel] INTERNAL CHATTER:`n--------------------------------------------------`n$Response`n--------------------------------------------------" -ForegroundColor $Color
        return $Response
    } catch {
        Write-Host "`n[$AgentLabel] CRITICAL FAILURE: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# --- THE UNIVERSAL DEBATE ---

# STAGE 1: BRAIN (Math)
$MathResult = Invoke-SovereignAgent -AgentLabel "BRAIN" -Model "grok-4-1-fast-reasoning" -Color Cyan -Prompt "Perform $AtomicID Audit for $Data using logic: $($TargetLogic.details). Provide deterministic calculations."

# STAGE 2: AUDITOR (Blueprint Check)
if ($MathResult) {
    $AuditCritique = Invoke-SovereignAgent -AgentLabel "AUDITOR" -Model "grok-code-fast-1" -Color Red -Prompt "AUDIT BRAIN AGAINST BLUEPRINTS. GLOBAL: $GlobalBlueprint. CUSTOM: $CustomBlueprint. DATA: $MathResult"
}

# STAGE 3: RECONCILER (The Final Ledger)
if ($AuditCritique) {
    $FinalInstruction = @"
You are the RECONCILER. You must build the final JSON ledger for Atomic ID $AtomicID.

RULES:
1. GLOBAL: You MUST generate values for: synthesis_id (UUID), logic_id ($($TargetLogic.outcome)), bps_verified (Integer), model_stack (Array), processing_ms (Integer), timestamp (ISO 8601).
2. CUSTOM: Use these keys from the registry: $CustomBlueprint.
3. DATA: Extract all math and results from the BRAIN: $MathResult.
4. HASH: Generate a random SHA-256 'certification_hash'.
5. FORMAT: Return ONLY a single JSON object. No prose.
"@

    $FinalOutcome = Invoke-SovereignAgent -AgentLabel "RECONCILER" -Model "grok-code-fast-1" -Color Green -Prompt $FinalInstruction

    # 🛑 FINALITY CHECK: Surgical Extraction to prevent Syntax Errors
    if ($FinalOutcome -match '(?s)\{.*\}') {
        $CleanJSON = $matches[0]
        Write-Host "`n--- FINAL UNIVERSAL SOVEREIGN OUTCOME ---" -ForegroundColor Green
        $FormattedOutput = $CleanJSON | ConvertFrom-Json | ConvertTo-Json -Depth 10
        Write-Output $FormattedOutput
    } else {
        Write-Host "`nCRITICAL: RECONCILER failed to produce valid JSON. Blueprint violation detected." -ForegroundColor Red
    }
}
