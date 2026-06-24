# Статический фронтенд отдаётся через nginx
FROM nginx:alpine

# Очищаем дефолтную страницу nginx
RUN rm -rf /usr/share/nginx/html/*

# Конфиг nginx и статика фронтенда
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

# Базовый URL API — на тот же origin (фронт ходит на /api/v1, nginx проксирует на бэкенд)
RUN sed -i 's#http://localhost:8000/api/v1#/api/v1#g' /usr/share/nginx/html/assets/js/api.js

EXPOSE 80
