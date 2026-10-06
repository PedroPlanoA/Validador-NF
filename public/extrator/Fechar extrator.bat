@echo off
chcp 65001 >nul
title Extrator Emissor Nacional - fechar
echo.
powershell -NoProfile -Command ^
  "$pasta = '%~dp0';" ^
  "$alvo = @(Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -and $_.Path.StartsWith($pasta, 'OrdinalIgnoreCase') });" ^
  "if ($alvo.Count -eq 0) { Write-Host '  Nao estava aberto.' } else { foreach ($p in $alvo) { Stop-Process -Id $p.Id -Force; Write-Host ('  Fechado (PID ' + $p.Id + ').') } }"
echo.
echo   A pasta ja pode ser substituida, e as notas carregadas sairam da memoria.
echo   Para usar de novo: Iniciar extrator.bat, ou reinicie o computador se ele
echo   estiver instalado para subir sozinho.
echo.
pause
