# Convert the copied desktop SVGs into native Android vector drawables.
param([switch]$Check)

$ErrorActionPreference = 'Stop'
$taskAndroidRoot = Split-Path -Parent $PSScriptRoot
$taskAssetRoot = Join-Path $taskAndroidRoot 'app\src\main\assets\icons'
$taskDrawableRoot = Join-Path $taskAndroidRoot 'app\src\main\res\drawable'
New-Item -ItemType Directory -Path $taskDrawableRoot -Force | Out-Null

foreach ($taskIconName in @('search', 'heart', 'image-down', 'settings', 'x', 'chevron-right')) {
    [xml]$taskSvg = Get-Content -Raw -LiteralPath (Join-Path $taskAssetRoot "$taskIconName.svg")
    $taskPaths = foreach ($taskShape in $taskSvg.DocumentElement.ChildNodes) {
        switch ($taskShape.LocalName) {
            'path' { $taskPathData = $taskShape.GetAttribute('d') }
            'circle' {
                $taskNumberFormat = [Globalization.CultureInfo]::InvariantCulture
                $taskCx = [double]::Parse($taskShape.GetAttribute('cx'), $taskNumberFormat)
                $taskCy = [double]::Parse($taskShape.GetAttribute('cy'), $taskNumberFormat)
                $taskRadius = [double]::Parse($taskShape.GetAttribute('r'), $taskNumberFormat)
                $taskLeft = ($taskCx - $taskRadius).ToString($taskNumberFormat)
                $taskRight = ($taskCx + $taskRadius).ToString($taskNumberFormat)
                $taskY = $taskCy.ToString($taskNumberFormat)
                $taskR = $taskRadius.ToString($taskNumberFormat)
                $taskPathData = "M$taskLeft,$taskY A$taskR,$taskR 0,1 0 $taskRight,$taskY A$taskR,$taskR 0,1 0 $taskLeft,$taskY"
            }
            default { throw "Unsupported SVG element: $($taskShape.LocalName)" }
        }
        $taskPathData = [System.Security.SecurityElement]::Escape($taskPathData)
        '    <path android:fillColor="@android:color/transparent" android:strokeColor="#FF000000" android:strokeWidth="2" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="' + $taskPathData + '" />'
    }
    $taskVector = @(
        '<?xml version="1.0" encoding="utf-8"?>'
        '<!-- Generated from assets/icons/' + $taskIconName + '.svg by scripts/sync-icons.ps1. -->'
        '<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">'
        $taskPaths
        '</vector>'
    ) -join "`n"
    $taskResourceName = 'ic_' + $taskIconName.Replace('-', '_') + '.xml'
    $taskOutputPath = Join-Path $taskDrawableRoot $taskResourceName
    if ($Check) {
        if (-not [System.IO.File]::Exists($taskOutputPath) -or [System.IO.File]::ReadAllText($taskOutputPath) -ne "$taskVector`n") {
            throw "Vector drawable does not match its SVG asset: $taskResourceName"
        }
    } else {
        [System.IO.File]::WriteAllText($taskOutputPath, "$taskVector`n", [System.Text.UTF8Encoding]::new($false))
    }
}
if ($Check) { Write-Output 'PASS: all six native icons match their SVG assets.' }
else { Write-Output 'Generated six native icons from the desktop SVG assets.' }
