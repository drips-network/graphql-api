FROM node:20-alpine3.16

COPY ./app/startup.sh /

RUN apk add --no-cache git

CMD ["/startup.sh"]
