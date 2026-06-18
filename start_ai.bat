@echo off
echo Starting Busted AI Backend...
cd ai_service
call .\ai-env\Scripts\activate.bat
python start.py
pause
