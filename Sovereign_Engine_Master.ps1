# --- SOVEREIGN V25: THE FINAL GLOBAL RECIPE ---
$xAIKey = "ENTER YOUR XAI KEY HERE"
$RegistryUrl = "https://raw.githubusercontent.com/synthesis-ledger/synthesis-ledger/main/genesis_onchain.json"

# 1. DYNAMIC REGISTRY FETCH
$Registry = Invoke-RestMethod -Uri $RegistryUrl -Method Get -UseBasicParsing
$AtomicID =  # Polymorphic: Change this to 91, 28, or any other ID.
$Data = @"

"@
$TargetLogic = $Registry | Where-Object { $_.id -eq $AtomicID }

# 2. CONTRACT SKELETON (Ensures Global Pillars exist)
$GlobalBlueprint = "synthesis_id, logic_id, bps_verified, model_stack, processing_ms, timestamp"
$CustomBlueprint = $TargetLogic.custom_outputs | ConvertTo-Json -Depth 10

function Invoke-SovereignAgent($Prompt, $Model, $AgentLabel, $Color) {
    Write-Host "`n>>> [$AgentLabel] IS PROCESSING..." -ForegroundColor $Color
    $Body = @{ model = $Model; messages = @(@{ role = "user"; content = $Prompt }); temperature = 0 } | ConvertTo-Json -Compress
    $Headers = @{ "Authorization" = "Bearer $xAIKey"; "Content-Type" = "application/json" }
    $Response = (Invoke-WebRequest -Uri "https://api.x.ai/v1/chat/completions" -Method Post -Headers $Headers -Body ([System.Text.Encoding]::UTF8.GetBytes($Body)) -UseBasicParsing | ConvertFrom-Json).choices[0].message.content
    Write-Host "`n[$AgentLabel] INTERNAL CHATTER:`n--------------------------------------------------`n$Response`n--------------------------------------------------" -ForegroundColor $Color
    return $Response
}

# --- THE UNIVERSAL DEBATE ---
# STAGE 1: BRAIN (Math)
$MathResult = Invoke-SovereignAgent -AgentLabel "BRAIN" -Model "grok-4-1-fast-reasoning" -Color Cyan -Prompt "Perform $AtomicID Audit for $Data using logic: $($TargetLogic.details)."

# STAGE 2: AUDITOR (Blueprint Check)
$AuditCritique = Invoke-SovereignAgent -AgentLabel "AUDITOR" -Model "grok-code-fast-1" -Color Red -Prompt "AUDIT BRAIN AGAINST BLUEPRINTS. GLOBAL: $GlobalBlueprint. CUSTOM: $CustomBlueprint. DATA: $MathResult"

# STAGE 3: RECONCILER (The Final Ledger)
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

Write-Host "`n--- FINAL UNIVERSAL SOVEREIGN OUTCOME ---" -ForegroundColor Green
$FinalOutcome
