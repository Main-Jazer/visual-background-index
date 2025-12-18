@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem -----------------------------------------------------------------------------
rem INJECT-UI-SCHEMA.bat
rem
rem Ensures each `effects\jazer-*.html` loads its matching UI schema:
rem   effects\ui-schema\<effect>.ui.json
rem
rem Default: dry-run (prints what would change)
rem Usage:
rem   INJECT-UI-SCHEMA.bat --apply
rem   INJECT-UI-SCHEMA.bat --dry-run
rem   INJECT-UI-SCHEMA.bat --apply --force
rem
rem Notes:
rem - Looks for an existing `attachEffectUI({ ... schemaUrl: ... })` block and skips unless --force.
rem - Injects `import { attachEffectUI } from '../lib/engine/jazer-effect-ui-schema.js';`
rem - Injects the standard window.JAZER_UI/JAZER_EXPOSE/JAZER_UI_READY block after imports.
rem -----------------------------------------------------------------------------

set "MODE=dry-run"
set "FORCE=0"

:parse_args
if "%~1"=="" goto :args_done
if /I "%~1"=="--apply" set "MODE=apply"
if /I "%~1"=="--dry-run" set "MODE=dry-run"
if /I "%~1"=="--force" set "FORCE=1"
if /I "%~1"=="-h" goto :usage
if /I "%~1"=="--help" goto :usage
shift
goto :parse_args

:usage
echo Usage:
echo   %~nx0 --apply [--force]
echo   %~nx0 --dry-run
echo.
echo Options:
echo   --apply     Write changes to files
echo   --dry-run   Print changes only ^(default^)
echo   --force     Re-inject even if attachEffectUI exists
exit /b 0

:args_done

set "SCRIPT=%~dp0scripts\\inject-ui-schema.ps1"
if not exist "%SCRIPT%" (
  echo Missing script: "%SCRIPT%"
  exit /b 1
)

set "PSEXE="

rem Prefer pwsh (PowerShell 7) when available, otherwise fall back to Windows PowerShell.
if not defined PSEXE if exist "%ProgramFiles%\\PowerShell\\7\\pwsh.exe" set "PSEXE=%ProgramFiles%\\PowerShell\\7\\pwsh.exe"
if not defined PSEXE for /d %%D in ("%ProgramFiles%\\WindowsApps\\Microsoft.PowerShell_*_x64__8wekyb3d8bbwe") do (
  if not defined PSEXE if exist "%%D\\pwsh.exe" set "PSEXE=%%D\\pwsh.exe"
)
if not defined PSEXE if exist "%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe" set "PSEXE=%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
if not defined PSEXE set "PSEXE=powershell"

set "FORCEARG="
if "%FORCE%"=="1" set "FORCEARG=-Force"

"%PSEXE%" -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" -Mode "%MODE%" %FORCEARG%

exit /b %ERRORLEVEL%
