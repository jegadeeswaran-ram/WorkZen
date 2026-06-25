@echo off
set NEXT_PUBLIC_API_URL=https://workzen.redonix.in
set API_INTERNAL_URL=http://localhost:3001
set NEXT_TELEMETRY_DISABLED=1
set FORCE_COLOR=0
set NO_COLOR=1

echo Build started at %TIME% > "i:\Upcoming Projects\WorkZen-Php\nextjs-build.log"

cd /d "i:\Upcoming Projects\WorkZen-Php\apps\web"
echo Working directory: %CD% >> "i:\Upcoming Projects\WorkZen-Php\nextjs-build.log"

node "i:\Upcoming Projects\WorkZen-Php\node_modules\next\dist\bin\next" build >> "i:\Upcoming Projects\WorkZen-Php\nextjs-build.log" 2>&1
set EXITCODE=%ERRORLEVEL%

echo Build finished at %TIME% exit=%EXITCODE% >> "i:\Upcoming Projects\WorkZen-Php\nextjs-build.log"
exit %EXITCODE%
