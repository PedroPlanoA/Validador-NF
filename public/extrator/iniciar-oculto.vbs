' Abre o Extrator do Emissor Nacional em segundo plano, sem janela.
' Usado pelo atalho que sobe junto com o Windows.
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh  = CreateObject("WScript.Shell")
sh.CurrentDirectory = fso.GetParentFolderName(WScript.ScriptFullName)
' O 0 esconde a janela; o False não espera o programa terminar.
sh.Run "node\node.exe servidor.mjs --sem-navegador", 0, False
