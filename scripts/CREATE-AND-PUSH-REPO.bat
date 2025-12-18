@echo off
echo ===================================================
echo  CREATE AND PUSH 'Three JS Custom Visuals' REPO
echo ===================================================

echo.
echo 1. Staging all files...
git add .

echo.
echo 2. Committing changes...
git commit -m "Initial commit: Three JS Custom Visuals"

echo.
echo 3. Attempting to create repository 'Three-JS-Custom-Visuals' on GitHub...
echo    (Requires GitHub CLI 'gh' to be installed and authenticated)
echo.

REM Try to create the repo. If 'origin' already exists, we might need to remove it or rename it.
REM We will try to remove the existing 'origin' pointing to the old repo first to avoid conflicts
REM if the user wants this to be a *new* repo.
echo Checking for existing remote...
git remote remove origin 2>nul

echo Creating new repo via GitHub CLI...
call gh repo create "Three-JS-Custom-Visuals" --public --source=. --remote=origin --push

if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Repository created and code pushed.
    echo View it at: https://github.com/%USERNAME%/Three-JS-Custom-Visuals
) else (
    echo.
    echo ---------------------------------------------------
    echo AUTOMATIC CREATION FAILED.
    echo.
    echo Common reasons:
    echo  - GitHub CLI (gh) is not installed.
    echo  - You are not logged in (run 'gh auth login').
    echo  - Repository name already exists.
    echo.
    echo MANUAL INSTRUCTIONS:
    echo 1. Go to https://github.com/new
    echo 2. Create a repository named "Three-JS-Custom-Visuals"
    echo 3. Run these commands in your terminal:
    echo.
    echo    git remote add origin https://github.com/YOUR_GITHUB_USERNAME/Three-JS-Custom-Visuals.git
    echo    git branch -M main
    echo    git push -u origin main
    echo ---------------------------------------------------
)

pause
