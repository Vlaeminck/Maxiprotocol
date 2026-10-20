$text = @'
If (Process.ProcessRunning ProcessName: $'''MAXIREST''') Then
    UIAutomation.FocusWindow.FocusWindowByTitle WindowTitle: $'''*MaxiREST*'''
Else
    System.RunApplication.RunApplication ApplicationPath: $'''C:\MaxiREST_SQL\MAXIREST.EXE''' WorkingDirectory: $'''C:\MaxiREST_SQL''' WindowStyle: System.ProcessWindowStyle.Normal ProcessId=> ProcessId
    Wait 4
    MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''ADMTOM{Tab}ADMTOM1{Enter}''' DelayBetweenKeystrokes: 100
    Wait 3
End
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''%{i}v''' DelayBetweenKeystrokes: 150
Wait 2
UIAutomation.FocusWindow.FocusWindowByTitle WindowTitle: $'''*Informes de ventas*'''
Wait 1
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''Ventas por formas de cobro''' DelayBetweenKeystrokes: 50
Wait 1
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''{Enter}''' DelayBetweenKeystrokes: 100
Wait 3
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''{Escape}''' DelayBetweenKeystrokes: 100
Wait 1
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''Ventas por día (por concepto){Enter}''' DelayBetweenKeystrokes: 80
Wait 3
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''{Escape}''' DelayBetweenKeystrokes: 100
Wait 1
MouseAndKeyboard.SendKeys.SendKeys TextToSend: $'''%{s}''' DelayBetweenKeystrokes: 100
Wait 1
Display.ShowMessage Title: $'''MaxiProtocol''' Message: $'''Extracción de informes de Maxirest completada con éxito. Tablas DBF sincronizadas.''' Icon: Display.Icon.Information Buttons: Display.Buttons.OK DefaultButton: Display.DefaultButton.Button1 IsTopMost: False

'@
Set-Clipboard -Value $text
Write-Output "Clipboard set successfully!"
