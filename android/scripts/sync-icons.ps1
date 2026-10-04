# Convert the copied desktop SVGs into native Android vector drawables.
param([switch]$Check)

$ErrorActionPreference = 'Stop'
$taskAndroidRoot = Split-Path -Parent $PSScriptRoot
$taskAssetRoot = Join-Path $taskAndroidRoot 'app\src\main\assets\icons'
$taskDrawableRoot = Join-Path $taskAndroidRoot 'app\src\main\res\drawable'
New-Item -ItemType Directory -Path $taskDrawableRoot -Force | Out-Null

$taskIconNames = @('search', 'heart', 'heart-filled', 'image-down', 'settings', 'x', 'chevron-right', 'square', 'square-check', 'square-arrow-out-up-right')
foreach ($taskIconName in $taskIconNames) {
    [xml]$taskSvg = Get-Content -Raw -LiteralPath (Join-Path $taskAssetRoot "$taskIconName.svg")
    $taskFill = if ($taskSvg.DocumentElement.GetAttribute('fill') -eq 'none') { '@android:color/transparent' } else { $taskSvg.DocumentElement.GetAttribute('fill') }
    $taskStroke = if ($taskSvg.DocumentElement.GetAttribute('stroke') -eq 'currentColor') { '#FF000000' } else { $taskSvg.DocumentElement.GetAttribute('stroke') }
    $taskPaths = foreach ($taskShape in $taskSvg.DocumentElement.ChildNodes) {
        switch ($taskShape.LocalName) {
            'path' { $taskPathData = $taskShape.GetAttribute('d') }
            'rect' {
                $taskNumberFormat = [Globalization.CultureInfo]::InvariantCulture
                $taskX = [double]::Parse($taskShape.GetAttribute('x'), $taskNumberFormat)
                $taskY = [double]::Parse($taskShape.GetAttribute('y'), $taskNumberFormat)
                $taskWidth = [double]::Parse($taskShape.GetAttribute('width'), $taskNumberFormat)
                $taskHeight = [double]::Parse($taskShape.GetAttribute('height'), $taskNumberFormat)
                $taskRadius = [double]::Parse($taskShape.GetAttribute('rx'), $taskNumberFormat)
                $taskRight = $taskX + $taskWidth
                $taskBottom = $taskY + $taskHeight
                $taskPathData = "M$($taskX + $taskRadius),$taskY H$($taskRight - $taskRadius) A$taskRadius,$taskRadius 0,0 1 $taskRight,$($taskY + $taskRadius) V$($taskBottom - $taskRadius) A$taskRadius,$taskRadius 0,0 1 $($taskRight - $taskRadius),$taskBottom H$($taskX + $taskRadius) A$taskRadius,$taskRadius 0,0 1 $taskX,$($taskBottom - $taskRadius) V$($taskY + $taskRadius) A$taskRadius,$taskRadius 0,0 1 $($taskX + $taskRadius),$taskY Z"
            }
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
        '    <path android:fillColor="' + $taskFill + '" android:strokeColor="' + $taskStroke + '" android:strokeWidth="2" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="' + $taskPathData + '" />'
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
if ($Check) { Write-Output "PASS: all $($taskIconNames.Count) native icons match their SVG assets." }
else { Write-Output "Generated $($taskIconNames.Count) native icons from the desktop SVG assets." }
