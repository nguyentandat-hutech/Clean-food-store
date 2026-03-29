@echo off
REM ============================================================
REM start_yolo_server.bat  Khởi động Python YOLO Inference Server
REM Chạy file này trước khi start Node.js backend
REM ============================================================

echo [YOLO] Kiem tra Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo [LOI] Python chua duoc cai dat. Tai tai: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [YOLO] Chuyen vao thu muc python...
cd /d "%~dp0"

REM Kiem tra virtualenv hay global
if exist "venv\Scripts\activate.bat" (
    echo [YOLO] Kich hoat virtual environment...
    call "venv\Scripts\activate.bat"
) else (
    echo [YOLO] Khong tim thay venv, dung Python global.
)

REM Kiem tra thu vien
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo [YOLO] Cai dat thu vien lan dau...
    pip install -r requirements.txt
)

REM Doc API key tu .env
if exist "..\env" (
    for /f "tokens=1,2 delims==" %%a in (..\env) do (
        if "%%a"=="ROBOFLOW_API_KEY" set ROBOFLOW_API_KEY=%%b
        if "%%a"=="YOLO_SERVER_PORT" set YOLO_SERVER_PORT=%%b
    )
)

if "%ROBOFLOW_API_KEY%"=="" (
    echo [CANH BAO] ROBOFLOW_API_KEY chua duoc dat!
    echo   Them vao backend\.env:
    echo   ROBOFLOW_API_KEY=rf_xxxxxxxxxxxxxx
)

echo [YOLO] Khoi dong Freshness Detection Server tren cong %YOLO_SERVER_PORT%...
echo [YOLO] Dung Ctrl+C de dung server.
echo.
python freshness_server.py

pause
