const fs = require('fs');
const { execSync } = require('child_process');

const psScript = `
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$proc = Get-Process MAXIREST -ErrorAction SilentlyContinue
if (-not $proc) {
    Write-Output "MAXIREST is not running"
    exit
}

$element = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
if ($element) {
    Write-Output "MainWindow Name: '$($element.Current.Name)'"
    Write-Output "ClassName: '$($element.Current.ClassName)'"
    Write-Output "ControlType: '$($element.Current.ControlType.ProgrammaticName)'"
    
    # Enumerate top children / menu items
    $condition = [System.Windows.Automation.Condition]::TrueCondition
    $children = $element.FindAll([System.Windows.Automation.TreeScope]::Children, $condition)
    Write-Output "Children count: $($children.Count)"
    foreach ($child in $children) {
        Write-Output "  - Child: Name='$($child.Current.Name)', Class='$($child.Current.ClassName)', Type='$($child.Current.ControlType.ProgrammaticName)'"
    }
} else {
    Write-Output "Could not get AutomationElement from MainWindowHandle"
}
`;

fs.writeFileSync('C:/Users/Gardenias/Desktop/DEVS/Maxiprotocol/Maxiprotocol/tools/inspect_uia.ps1', psScript);

try {
    const out = execSync('powershell -ExecutionPolicy Bypass -File tools/inspect_uia.ps1', { stdio: 'pipe' }).toString();
    console.log(out);
} catch (e) {
    console.log('Error:', e.message);
}
