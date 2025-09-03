FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY src/cpu-spike.js .

EXPOSE 3003

CMD ["node", "cpu-spike.js"]
