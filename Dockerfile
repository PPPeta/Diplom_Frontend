# Статический фронтенд отдаётся через nginx
FROM nginx:alpine

# Очищаем дефолтную страницу nginx
RUN rm -rf /usr/share/nginx/html/*

# Конфиг nginx и статика фронтенда
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html

EXPOSE 80
