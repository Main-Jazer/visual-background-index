param(
  [ValidateSet('dry-run', 'apply')]
  [string]$Mode = 'dry-run',

  [switch]$Force,

  [string]$EffectsDir = (Join-Path $PSScriptRoot '..\\effects')
)

$ErrorActionPreference = 'Stop'

function Get-Newline([string]$text) {
  if ($text -match "`r`n") { return "`r`n" }
  return "`n"
}

function Write-Utf8NoBom([string]$path, [string]$content) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

$effectsDirResolved = (Resolve-Path -LiteralPath $EffectsDir).Path
$files = Get-ChildItem -LiteralPath $effectsDirResolved -Filter 'jazer-*.html' -File | Sort-Object Name

Write-Host ("Found {0} effect html files in {1}" -f $files.Count, $effectsDirResolved)

$attachImportLine = "import { attachEffectUI } from '../lib/engine/jazer-effect-ui-schema.js';"
$injectLines = @(
  ''
  '// --- JaZeR UI schema (injected) ---'
  "const __jazerEffectFile = location.pathname.split('/').pop() || '';"
  "const __jazerEffectName = __jazerEffectFile.replace(/\\.html$/i, '');"
  'const { ui, expose, ready } = attachEffectUI({'
  '  title: document.title,'
  '  schemaUrl: new URL(`./ui-schema/${__jazerEffectName}.ui.json`, import.meta.url)'
  '});'
  'window.JAZER_UI = ui;'
  'window.JAZER_EXPOSE = expose;'
  'window.JAZER_UI_READY = ready;'
  '// ------------------------------------'
  ''
)

$counts = [ordered]@{
  updated = 0
  wouldUpdate = 0
  skippedAlready = 0
  skippedNoModule = 0
  skippedNoChangesNeeded = 0
  skippedUnchanged = 0
}

foreach ($file in $files) {
  $path = $file.FullName
  $text = Get-Content -Raw -LiteralPath $path
  $nl = Get-Newline $text

  $scriptMatch = [regex]::Match(
    $text,
    '(?is)<script\b[^>]*\btype\s*=\s*["'']module["''][^>]*>\s*(?<body>[\s\S]*?)\s*</script>'
  )
  if (-not $scriptMatch.Success) {
    Write-Warning ("SKIP (no module script): {0}" -f $file.Name)
    $counts.skippedNoModule++
    continue
  }

  $body = $scriptMatch.Groups['body'].Value

  $hasAttachCall = ($body -match 'attachEffectUI\s*\(')
  $hasSchemaUrl = ($body -match 'schemaUrl\s*:')
  $hasReadyExport = ($body -match 'window\.JAZER_UI_READY\s*=')
  $hasUiExport = ($body -match 'window\.JAZER_UI\s*=')
  $hasExposeExport = ($body -match 'window\.JAZER_EXPOSE\s*=')
  $hasInjectedMarker = ($body -match 'JaZeR UI schema \(injected\)')

  $lines = $body -split "\r?\n"

  $inBlockComment = $false
  $insertIndex = 0
  for ($i = 0; $i -lt $lines.Length; $i++) {
    $line = $lines[$i]
    $trimSource = $line
    if ($null -eq $trimSource) { $trimSource = '' }
    $trim = $trimSource.Trim()

    if ($inBlockComment) {
      if ($trim -match '\*/') { $inBlockComment = $false }
      continue
    }
    if ($trim -eq '') { continue }
    if ($trim -match '^//') { continue }
    if ($trim -match '^/\*') {
      if ($trim -notmatch '\*/') { $inBlockComment = $true }
      continue
    }
    if ($trim -match '^import\b') {
      $insertIndex = $i + 1
      continue
    }
    break
  }

  $importExists = ($body -match "import\s*\{\s*attachEffectUI\s*\}\s*from\s*['""]\.\./lib/engine/jazer-effect-ui-schema\.js['""]\s*;?")
  if (-not $importExists) {
    if ($insertIndex -le 0) {
      $lines = @($attachImportLine) + $lines
      $insertIndex = 1
    } else {
      $head = @()
      if ($insertIndex -gt 0) { $head = $lines[0..($insertIndex - 1)] }
      $tail = $lines[$insertIndex..($lines.Length - 1)]
      $lines = @($head + $attachImportLine + $tail)
      $insertIndex++
    }
  }

  if ($hasAttachCall) {
    $needsReady = (-not $hasReadyExport)
    $needsExports = (-not $hasUiExport) -or (-not $hasExposeExport) -or (-not $hasReadyExport)
    if (-not $Force -and $hasSchemaUrl -and $hasReadyExport -and $hasUiExport -and $hasExposeExport) {
      $counts.skippedNoChangesNeeded++
      continue
    }

    $callLineIndex = -1
    for ($i = 0; $i -lt $lines.Length; $i++) {
      if ($lines[$i] -match 'attachEffectUI\s*\(') { $callLineIndex = $i; break }
    }
    if ($callLineIndex -lt 0) {
      $counts.skippedUnchanged++
      continue
    }

    $indent = ''
    if ($lines[$callLineIndex] -match '^(?<i>\s*)') { $indent = $Matches['i'] }

    if ($needsReady) {
      $line0 = $lines[$callLineIndex]
      if ($line0 -match '(?<decl>\bconst\b|\blet\b|\bvar\b)\s*\{\s*(?<vars>[^}]*)\s*\}\s*=\s*attachEffectUI\s*\(') {
        $vars = $Matches['vars']
        if ($vars -notmatch '(^|[,\s])ready([,\s]|$)') {
          $varsTrim = $vars.Trim()
          if ($varsTrim -eq '') { $varsTrim = 'ready' } else { $varsTrim = "$varsTrim, ready" }
          $lines[$callLineIndex] = [regex]::Replace(
            $line0,
            '(\bconst\b|\blet\b|\bvar\b)\s*\{\s*[^}]*\s*\}\s*=\s*attachEffectUI\s*\(',
            "$($Matches['decl']) { $varsTrim } = attachEffectUI(",
            1
          )
        }
      }
    }

    $closeIndex = -1
    for ($i = $callLineIndex; $i -lt $lines.Length; $i++) {
      if ($lines[$i] -match '\}\)\s*;\s*$' -or $lines[$i] -match '\}\s*\)\s*;\s*$' -or $lines[$i] -match '\}\);\s*$') {
        $closeIndex = $i
        break
      }
    }
    if ($closeIndex -lt 0) {
      $counts.skippedUnchanged++
      continue
    }

    $insertionPoint = $closeIndex + 1
    $windowUiLine = "${indent}window.JAZER_UI = ui;"
    $windowExposeLine = "${indent}window.JAZER_EXPOSE = expose;"
    $windowReadyLine = "${indent}window.JAZER_UI_READY = ready;"

    $existing = @{}
    $lastWindowLineIndex = -1
    $scanEnd = [Math]::Min($lines.Length - 1, $insertionPoint + 12)
    for ($i = $insertionPoint; $i -le $scanEnd; $i++) {
      if ($lines[$i] -match 'window\.JAZER_UI\s*=') { $existing.ui = $true }
      if ($lines[$i] -match 'window\.JAZER_EXPOSE\s*=') { $existing.expose = $true }
      if ($lines[$i] -match 'window\.JAZER_UI_READY\s*=') { $existing.ready = $true }
      if ($lines[$i] -match 'window\.JAZER_(UI|EXPOSE|UI_READY)\s*=') { $lastWindowLineIndex = $i }
    }

    $toInsert = @()
    if (-not $existing.ui) { $toInsert += $windowUiLine }
    if (-not $existing.expose) { $toInsert += $windowExposeLine }
    if (-not $existing.ready) { $toInsert += $windowReadyLine }

    if ($toInsert.Count -gt 0) {
      if ($lastWindowLineIndex -ge 0) {
        $insertionPoint = $lastWindowLineIndex + 1
      }
      $head3 = @()
      if ($insertionPoint -gt 0) { $head3 = $lines[0..($insertionPoint - 1)] }
      $tail3 = @()
      if ($insertionPoint -le ($lines.Length - 1)) { $tail3 = $lines[$insertionPoint..($lines.Length - 1)] }
      $lines = @($head3 + $toInsert + $tail3)
    }

    $newBody = ($lines -join $nl).TrimEnd()
    $newText =
      $text.Substring(0, $scriptMatch.Groups['body'].Index) +
      $newBody +
      $text.Substring($scriptMatch.Groups['body'].Index + $scriptMatch.Groups['body'].Length)

    if ($newText -eq $text) {
      $counts.skippedUnchanged++
      continue
    }

    if ($Mode -eq 'apply') {
      Write-Utf8NoBom -path $path -content $newText
      Write-Host ("UPDATED: {0}" -f $file.Name)
      $counts.updated++
    } else {
      Write-Host ("WOULD UPDATE: {0}" -f $file.Name)
      $counts.wouldUpdate++
    }

    continue
  }

  $injectBlock = ($injectLines -join $nl)
  $head2 = @()
  if ($insertIndex -gt 0) { $head2 = $lines[0..($insertIndex - 1)] }
  $tail2 = $lines[$insertIndex..($lines.Length - 1)]
  $newBody = (@($head2 + $injectBlock + $tail2) -join $nl).TrimEnd()

  $newText =
    $text.Substring(0, $scriptMatch.Groups['body'].Index) +
    $newBody +
    $text.Substring($scriptMatch.Groups['body'].Index + $scriptMatch.Groups['body'].Length)

  if ($newText -eq $text) {
    $counts.skippedUnchanged++
    continue
  }

  if ($Mode -eq 'apply') {
    Write-Utf8NoBom -path $path -content $newText
    Write-Host ("UPDATED: {0}" -f $file.Name)
    $counts.updated++
  } else {
    Write-Host ("WOULD UPDATE: {0}" -f $file.Name)
    $counts.wouldUpdate++
  }
}

Write-Host ("Done. updated={0} wouldUpdate={1} skippedAlready={2} skippedNoModule={3} skippedUnchanged={4}" -f `
  $counts.updated, $counts.wouldUpdate, $counts.skippedAlready, $counts.skippedNoModule, $counts.skippedUnchanged)
Write-Host ("NoChangesNeeded={0}" -f $counts.skippedNoChangesNeeded)
