# ============================================================
# WorkZen Web Upload Script
# Uploads the Next.js standalone build to Hostinger server
# Run AFTER: npm run build (in apps/web)
# ============================================================

param(
    [string]$ServerIP = "88.222.211.181",
    [int]$Port = 65002,
    [string]$User = "u547357606"
)

Import-Module Posh-SSH -ErrorAction Stop

$password = ConvertTo-SecureString "Jega@2107@1986" -AsPlainText -Force
$cred = New-Object System.Management.Automation.PSCredential($User, $password)

$localWebDir = "i:\Upcoming Projects\WorkZen-Php\apps\web"
$localStandalone = "$localWebDir\.next\standalone"
$localStatic = "$localWebDir\.next\static"
$localPublic = "$localWebDir\public"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WorkZen Web — Uploading to Hostinger" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Verify build artifacts exist
if (-not (Test-Path "$localStandalone\apps\web\server.js")) {
    Write-Error "server.js not found! Run 'next build' first."
    exit 1
}

Write-Host "`n[1/5] Connecting to server..." -ForegroundColor Yellow
$session = New-SSHSession -ComputerName $ServerIP -Port $Port -Credential $cred -AcceptKey -Force
$sftp = New-SFTPSession -ComputerName $ServerIP -Port $Port -Credential $cred -AcceptKey -Force

Write-Host "[2/5] Creating directories on server..." -ForegroundColor Yellow
$r = Invoke-SSHCommand -SessionId $session.SessionId -Command @"
mkdir -p ~/workzen/apps/web/.next/standalone/apps/web
mkdir -p ~/workzen/apps/web/.next/static
mkdir -p ~/workzen/apps/web/public
echo "Directories ready"
"@
Write-Host $r.Output

Write-Host "[3/5] Creating tar archive of standalone build..." -ForegroundColor Yellow
$tarPath = "$env:TEMP\workzen-web-standalone.tar.gz"
Push-Location $localWebDir
try {
    # Create tar with relative paths
    & tar -czf $tarPath -C "$localWebDir" ".next/standalone" ".next/static" 2>&1
    if (Test-Path $localPublic) {
        & tar -czf $tarPath -C "$localWebDir" ".next/standalone" ".next/static" "public" 2>&1
    }
    Write-Host "Archive created: $('{0:N1} MB' -f ((Get-Item $tarPath).Length / 1MB))"
} finally {
    Pop-Location
}

Write-Host "[4/5] Uploading archive to server..." -ForegroundColor Yellow
Set-SFTPItem -SessionId $sftp.SessionId -Path $tarPath -Destination "/home/$User/workzen-web.tar.gz" -Force
Write-Host "Upload complete."

Write-Host "[5/5] Extracting on server and configuring..." -ForegroundColor Yellow
$r2 = Invoke-SSHCommand -SessionId $session.SessionId -Command @"
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:/home/u547357606/npm-global/bin:/usr/local/bin:/usr/bin

cd ~/workzen/apps/web
tar -xzf ~/workzen-web.tar.gz
echo "Extracted"

# Copy static and public into standalone
cp -r .next/static .next/standalone/apps/web/.next/static
[ -d public ] && cp -r public .next/standalone/apps/web/public || true
echo "Copied static files"

# Create wrapper start script (hPanel looks for this)
cat > ~/workzen/apps/web/start.js << 'EOF'
process.env.HOSTNAME = '0.0.0.0';
process.env.PORT = process.env.PORT || 3000;
require('./.next/standalone/apps/web/server.js');
EOF
echo "Created start.js"

# Start with PM2
/opt/alt/alt-nodejs20/root/usr/bin/node /home/u547357606/npm-global/lib/node_modules/pm2/bin/pm2 delete workzen-web 2>/dev/null || true
/opt/alt/alt-nodejs20/root/usr/bin/node /home/u547357606/npm-global/lib/node_modules/pm2/bin/pm2 start ~/workzen/apps/web/start.js --name workzen-web --cwd ~/workzen/apps/web
/opt/alt/alt-nodejs20/root/usr/bin/node /home/u547357606/npm-global/lib/node_modules/pm2/bin/pm2 save
echo "PM2 started"

# Show status
/opt/alt/alt-nodejs20/root/usr/bin/node /home/u547357606/npm-global/lib/node_modules/pm2/bin/pm2 list --no-color

# Cleanup tar
rm -f ~/workzen-web.tar.gz
echo "Cleanup done"
"@
Write-Host $r2.Output

Remove-SFTPSession -SessionId $sftp.SessionId
Remove-SSHSession -SessionId $session.SessionId

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Upload Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps (hPanel):" -ForegroundColor Yellow
Write-Host "  1. Login to hPanel → Hosting → Node.js"
Write-Host "  2. Create Application:"
Write-Host "     - Node.js version: 20"
Write-Host "     - App root: /home/$User/workzen/apps/web"
Write-Host "     - Startup file: start.js"
Write-Host "     - Domain: workzen.redonix.in"
Write-Host "  3. Add env variables in hPanel Node.js UI:"
Write-Host "     NODE_ENV=production"
Write-Host "     PORT=3000"
Write-Host "     NEXT_PUBLIC_API_URL=https://workzen.redonix.in"
Write-Host "     API_INTERNAL_URL=http://localhost:3001"
Write-Host ""
Write-Host "  API is already running via PM2 on port 3001."
