FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev \
  && mkdir -p /app/uploads \
  && chown -R node:node /app

COPY --chown=node:node . .

ENV NODE_ENV=production
EXPOSE 5000

USER node

CMD ["npm", "start"]
