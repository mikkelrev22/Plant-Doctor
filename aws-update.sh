!#/bin/sh
git pull
sudo docker system prune -f
sudo docker compose build --progress=plain
sudo docker compose up -d
