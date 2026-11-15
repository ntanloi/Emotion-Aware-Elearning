@echo off
chcp 65001 >nul
set PYTHONIOENCODING=utf-8
set AI_ALLOW_NO_SECRET=true
title AI Microservice - Emotion Aware Elearning (emotion_demo core)
cd /d "%~dp0"
if not exist venv (
    echo Tao moi truong ao Python 3.11 / 3.12 ...
    py -3.11 -m venv venv || py -3.12 -m venv venv || py -3.10 -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)
echo ==============================================================
echo   AI SERVICE: http://127.0.0.1:8000   (kiem tra: /health)
echo ==============================================================
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
pause
