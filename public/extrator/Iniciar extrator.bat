@echo off
chcp 65001 >nul
title Extrator Emissor Nacional
cd /d "%~dp0"
echo.
echo   Abrindo o Extrator do Emissor Nacional...
echo   Deixe esta janela aberta. Fechar aqui encerra a ferramenta.
echo.
node\node.exe servidor.mjs
if errorlevel 1 (
  echo.
  echo   A ferramenta encerrou. Leia a mensagem acima.
  pause
)
