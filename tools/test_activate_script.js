const fs = require('fs');

// VBScript to test activating Maxirest window
const vbs = `
Set WshShell = CreateObject("WScript.Shell")
success = WshShell.AppActivate("MaxiREST")
If Not success Then
    success = WshShell.AppActivate(3036)
End If
WScript.Echo "Activated: " & success
`;

fs.writeFileSync('C:/Users/Gardenias/Desktop/DEVS/Maxiprotocol/Maxiprotocol/tools/test_activate.vbs', vbs);
