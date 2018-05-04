@echo off
pm2 start server/web_server.js
pm2 start server/game_server.js 

