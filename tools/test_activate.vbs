
Set WshShell = CreateObject("WScript.Shell")
success = WshShell.AppActivate("MaxiREST")
If Not success Then
    success = WshShell.AppActivate(3036)
End If
WScript.Echo "Activated: " & success
