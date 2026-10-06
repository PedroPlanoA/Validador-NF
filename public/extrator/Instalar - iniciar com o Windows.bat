@echo off
chcp 65001 >nul
title Extrator Emissor Nacional - instalar
cd /d "%~dp0"
echo.
echo   Fazendo o extrator abrir junto com o Windows...
echo.
powershell -NoProfile -Command ^
  "$pasta = (Get-Location).Path;" ^
  "$alvo = Join-Path $pasta 'iniciar-oculto.vbs';" ^
  "if (-not (Test-Path $alvo)) { Write-Host '  ERRO: iniciar-oculto.vbs nao esta nesta pasta.'; exit 1 };" ^
  "$link = Join-Path ([Environment]::GetFolderPath('Startup')) 'Extrator Emissor Nacional.lnk';" ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut($link);" ^
  "$s.TargetPath = $alvo; $s.WorkingDirectory = $pasta; $s.Save();" ^
  "Start-Sleep -Milliseconds 300;" ^
  "$conf = (New-Object -ComObject WScript.Shell).CreateShortcut($link).TargetPath;" ^
  "if (Test-Path $conf) { Write-Host ('  Atalho criado, apontando para:'); Write-Host ('  ' + $conf) }" ^
  "else { Write-Host ('  ERRO: o atalho ficou apontando para ' + $conf) }"
echo.
echo   Abrindo agora, para nao precisar reiniciar...
start "" "%~dp0iniciar-oculto.vbs"
echo.
echo   Pronto. A partir de agora ele sobe sozinho quando voce liga o computador.
echo   A aba no Hub Fiscal passa a funcionar sem abrir nada.
echo.
pause
