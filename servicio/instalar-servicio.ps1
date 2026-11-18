# Instala LanguageTool como servicio de Windows (local, sin límites).
# Ejecutar con INSTALAR.bat (clic derecho > Ejecutar como administrador).

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Dir       = 'C:\LanguageTool'
$Port      = 8010
$ServiceId = 'LanguageTool'
$LtUrl     = 'https://languagetool.org/download/LanguageTool-stable.zip'
$WinSwUrl  = 'https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe'

function Paso($t) { Write-Host "`n>> $t" -ForegroundColor Cyan }
function Ok($t)   { Write-Host "   $t" -ForegroundColor Green }

# --- Comprobar administrador ---
$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) { throw 'Debes ejecutar este instalador como administrador.' }

# --- 1. Java ---
function Find-Java {
    $cands = @()
    $cmd = Get-Command java.exe -ErrorAction SilentlyContinue
    if ($cmd) { $cands += $cmd.Source }
    foreach ($root in 'C:\Program Files\Eclipse Adoptium', 'C:\Program Files\Java', 'C:\Program Files\Microsoft') {
        if (Test-Path $root) { $cands += (Get-ChildItem $root -Recurse -Filter java.exe -ErrorAction SilentlyContinue | ForEach-Object FullName) }
    }
    foreach ($j in $cands) {
        $out = (cmd /c "`"$j`" -version 2>&1") -join ' '
        if ($out -match 'version "(\d+)') { if ([int]$Matches[1] -ge 17) { return $j } }
    }
    return $null
}

Paso 'Buscando Java 17 o superior...'
$java = Find-Java
if (-not $java) {
    Write-Host '   No se encontró Java 17+. Instalando Java 21 con winget...' -ForegroundColor Yellow
    if (-not (Get-Command winget.exe -ErrorAction SilentlyContinue)) {
        throw 'No está winget. Instala Java 21 manualmente desde https://adoptium.net y vuelve a ejecutar.'
    }
    winget install --id EclipseAdoptium.Temurin.21.JRE -e --silent --accept-package-agreements --accept-source-agreements | Out-Host
    $java = Find-Java
    if (-not $java) { throw 'No se pudo instalar Java. Instálalo desde https://adoptium.net y vuelve a ejecutar.' }
}
Ok "Java: $java"

# --- 2. Quitar servicio anterior si existe ---
$svcExe = Join-Path $Dir "$ServiceId.exe"
if (Get-Service $ServiceId -ErrorAction SilentlyContinue) {
    Paso 'Quitando la versión anterior del servicio...'
    if (Test-Path $svcExe) { & $svcExe stop | Out-Null; & $svcExe uninstall | Out-Null }
    else { sc.exe stop $ServiceId | Out-Null; sc.exe delete $ServiceId | Out-Null }
    Start-Sleep -Seconds 3
}

# --- 3. Descargar LanguageTool ---
Paso 'Descargando LanguageTool (unos 250 MB, puede tardar)...'
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
$tmpZip = Join-Path $env:TEMP 'LanguageTool-stable.zip'
$tmpDir = Join-Path $env:TEMP 'LanguageTool-extract'
Invoke-WebRequest -Uri $LtUrl -OutFile $tmpZip -UseBasicParsing
if (Test-Path $tmpDir) { Remove-Item $tmpDir -Recurse -Force }
Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force
$jar = Get-ChildItem $tmpDir -Recurse -Filter 'languagetool-server.jar' | Select-Object -First 1
if (-not $jar) { throw 'El archivo descargado no contiene languagetool-server.jar.' }
$appDir = Join-Path $Dir 'app'
if (Test-Path $appDir) { Remove-Item $appDir -Recurse -Force }
Move-Item $jar.Directory.FullName $appDir
Remove-Item $tmpZip, $tmpDir -Recurse -Force -ErrorAction SilentlyContinue
Ok "LanguageTool en $appDir"

# --- 4. Envoltorio de servicio (WinSW) ---
Paso 'Descargando el administrador de servicios (WinSW)...'
Invoke-WebRequest -Uri $WinSwUrl -OutFile $svcExe -UseBasicParsing
New-Item -ItemType Directory -Force -Path (Join-Path $Dir 'logs') | Out-Null

$xml = @"
<service>
  <id>$ServiceId</id>
  <name>LanguageTool (corrector local)</name>
  <description>Servidor local de LanguageTool para corrección ortográfica y gramatical. Solo escucha en este equipo (localhost:$Port).</description>
  <executable>$java</executable>
  <arguments>-Xms128m -Xmx768m -cp languagetool-server.jar org.languagetool.server.HTTPServer --port $Port --allow-origin "*"</arguments>
  <workingdirectory>$appDir</workingdirectory>
  <startmode>Automatic</startmode>
  <delayedAutoStart>true</delayedAutoStart>
  <onfailure action="restart" delay="10 sec"/>
  <logpath>$Dir\logs</logpath>
  <log mode="roll-by-size">
    <sizeThreshold>10240</sizeThreshold>
    <keepFiles>3</keepFiles>
  </log>
</service>
"@
Set-Content -Path (Join-Path $Dir "$ServiceId.xml") -Value $xml -Encoding UTF8

# --- 5. Instalar e iniciar ---
Paso 'Instalando e iniciando el servicio...'
& $svcExe install | Out-Host
& $svcExe start   | Out-Host

# --- 6. Probar ---
Paso 'Esperando a que el corrector responda...'
$ok = $false
for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 2
    try {
        $r = Invoke-RestMethod -Method Post -Uri "http://localhost:$Port/v2/check" -Body @{ text = 'Hola, esto es una prueva.'; language = 'es' }
        if ($r.matches) { $ok = $true; break }
    } catch { }
}

if ($ok) {
    Write-Host "`n=================================================" -ForegroundColor Green
    Write-Host ' LISTO. LanguageTool funciona como servicio.' -ForegroundColor Green
    Write-Host " Dirección: http://localhost:$Port" -ForegroundColor Green
    Write-Host ' Arranca solo cada vez que enciendes el equipo.' -ForegroundColor Green
    Write-Host '=================================================' -ForegroundColor Green
} else {
    Write-Host "`nEl servicio se instaló pero todavía no responde." -ForegroundColor Yellow
    Write-Host "Espera un minuto y abre http://localhost:$Port/v2/languages en el navegador." -ForegroundColor Yellow
    Write-Host "Si no carga, revisa los registros en $Dir\logs" -ForegroundColor Yellow
}
