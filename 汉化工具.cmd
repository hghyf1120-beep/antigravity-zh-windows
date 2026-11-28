@echo off
setlocal DisableDelayedExpansion
chcp 65001 >nul
echo Antigravity 简体中文补丁 2.3.2  ^|  Windows x64  ^|  客户端 2.36.0
echo.
if not exist "%~dp0localize.py" goto extract
echo 1. 检查兼容性（只读）
echo 2. 安装中文
echo 3. 还原英文
echo 4. 退出
choice /c 1234 /n /m "请选择 [1-4] "
if errorlevel 4 exit /b
if errorlevel 3 goto restore
if errorlevel 2 goto install
if errorlevel 1 goto check
exit /b 1
:check
set "action=check"
goto detect
:install
set "action=install"
goto detect
:restore
set "action=restore"
:detect
py -3 -I -B -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>&1
if not errorlevel 1 goto launcher
python -I -B -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>&1
if errorlevel 1 goto missing
python -I -B -X utf8 "%~dp0localize.py" %action%
goto done
:launcher
py -3 -I -B -X utf8 "%~dp0localize.py" %action%
:done
set "result=%errorlevel%"
pause
exit /b %result%
:extract
echo 请先完整解压 ZIP，再从解压后的文件夹运行本工具。
pause
exit /b 1
:missing
echo 未找到可用的 Python 3.8 或更高版本。请安装 Python 3，并确保 py 或 python 命令可用。
echo 官方下载页 https://www.python.org/downloads/windows/
pause
exit /b 1
