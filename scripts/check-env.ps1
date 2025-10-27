Write-Host '🔎 Checking env...'
if (-Not (Test-Path '.env') -and -Not (Test-Path '.env.local')) { Write-Warning 'No .env/.env.local found' }
Write-Host 'NEXT_PUBLIC_API_BASE=' 