
FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY writer.js ./

CMD ["node", "writer.js"]

