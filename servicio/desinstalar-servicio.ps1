# Quita el servicio LanguageTool y borra sus archivos.
$ErrorActionPreference = 'Continue'
$Dir = 'C:\LanguageTool'
$ServiceId = 'LanguageTool'
$svcExe = Join-Path $Dir "$ServiceId.exe"

if (Get-Service $ServiceId -ErrorAction SilentlyContinue) {
    Write-Host 'Deteniendo y quitando el servicio...' -ForegroundColor Cyan
    if (Test-Path $svcExe) { & $svcExe stop | Out-Host; & $svcExe uninstall | Out-Host }
    else { sc.exe stop $ServiceId | Out-Null; sc.exe delete $ServiceId | Out-Host }
    Start-Sleep -Seconds 3
} else {
    Write-Host 'El servicio no estaba instalado.' -ForegroundColor Yellow
}

if (Test-Path $Dir) {
    Remove-Item $Dir -Recurse -Force
    Write-Host "Carpeta $Dir eliminada." -ForegroundColor Green
}
Write-Host 'Listo. (Java no se desinstala; puedes quitarlo desde Configuración > Aplicaciones si no lo usas.)' -ForegroundColor Green
