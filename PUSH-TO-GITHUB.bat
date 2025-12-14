@echo off
echo ========================================
echo  PUSHING TO GITHUB
echo ========================================
echo.
echo Commit ready to push:
git log -1 --oneline
echo.
echo Pushing to: https://github.com/Main-Jazer/visual-background-index
echo.
git push origin master
echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS! Changes pushed to GitHub.
) else (
    echo Push failed. You may need to authenticate.
    echo Try: gh auth login
    echo Or use GitHub Desktop
)
echo ========================================
pause
