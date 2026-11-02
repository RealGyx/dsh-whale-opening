@echo off
rem Runs the patcher with DSH's own Electron runtime, so no separate Node.js
rem install is required. If you do have Node.js 18+ you can alternatively run:
rem   node patcher\patch.mjs [options]
setlocal
if not defined ELECTRON_RUN_AS_NODE set "ELECTRON_RUN_AS_NODE=1"

set "EXE="
if defined DSH_INSTALL_DIR if exist "%DSH_INSTALL_DIR%\DeepSeek Harness.exe" set "EXE=%DSH_INSTALL_DIR%\DeepSeek Harness.exe"
if not defined EXE if exist "%LOCALAPPDATA%\Programs\DeepSeek Harness\DeepSeek Harness.exe" set "EXE=%LOCALAPPDATA%\Programs\DeepSeek Harness\DeepSeek Harness.exe"
if not defined EXE if exist "%LOCALAPPDATA%\DeepSeek Harness\DeepSeek Harness.exe" set "EXE=%LOCALAPPDATA%\DeepSeek Harness\DeepSeek Harness.exe"
if not defined EXE if exist "%ProgramFiles%\DeepSeek Harness\DeepSeek Harness.exe" set "EXE=%ProgramFiles%\DeepSeek Harness\DeepSeek Harness.exe"
if not defined EXE if exist "D:\DeepSeek Harness\DeepSeek Harness.exe" set "EXE=D:\DeepSeek Harness\DeepSeek Harness.exe"

if not defined EXE (
  echo error: could not find "DeepSeek Harness.exe".
  echo        set DSH_INSTALL_DIR to the directory that contains it, or run
  echo        node patcher\patch.mjs [options] with Node.js 18+.
  exit /b 1
)

"%EXE%" --expose-internals "%~dp0patch.mjs" %*
exit /b %errorlevel%
