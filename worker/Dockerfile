FROM node:20-bullseye-slim
RUN apt-get update && apt-get install -y       ca-certificates fonts-liberation libnss3 libxss1 libasound2 libatk-bridge2.0-0 libgtk-3-0 libx11-xcb1 libxcomposite1 libxrandr2 libgbm1 libatk1.0-0 libgdk-pixbuf2.0-0    && rm -rf /var/lib/apt/lists/*

WORKDIR /worker
COPY package.json ./
RUN npm i --omit=dev
COPY src/ ./src

RUN npx playwright install --with-deps

ENV NODE_ENV=production
CMD ["node", "src/worker.js"]
