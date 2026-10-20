FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY index.js ./

EXPOSE 5020

CMD ["npm", "start"]