FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_BASE_PATH=""
ENV VITE_BASE_PATH=$VITE_BASE_PATH

RUN npm run build

EXPOSE 4173

CMD ["npm", "run", "preview"]
