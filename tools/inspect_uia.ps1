
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
