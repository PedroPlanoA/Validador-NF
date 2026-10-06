@echo off
chcp 65001 >nul
title Extrator Emissor Nacional - nao iniciar com o Windows
echo.
powershell -NoProfile -Command ^
  "$link = Join-Path ([Environment]::GetFolderPath('Startup')) 'Extrator Emissor Nacional.lnk';" ^
  "if (Test-Path $link) { Remove-Item $link -Force; Write-Host '  Atalho removido.' } else { Write-Host '  Nao estava instalado.' }"
echo.
echo   O extrator nao sobe mais sozinho. Para usar, abra o Iniciar extrator.bat.
echo.
pause
