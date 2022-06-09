pm2 start /home/node_core_app/app.js
nohup blockchain-wallet-service start --port 3000 &
nohup python /home/bots/trade-bot.py &

exit 0