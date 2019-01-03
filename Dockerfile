FROM node:10-alpine

WORKDIR /app

RUN apk add --no-cache tini

COPY . .
RUN yarn -s

ENTRYPOINT ["/sbin/tini", "--"]

CMD ["yarn", "start"]
