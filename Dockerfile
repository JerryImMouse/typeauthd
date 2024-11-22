FROM node:18-alpine AS build

WORKDIR /typeauthd
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-slim

COPY --from=build /app/dist /app/dist
COPY package*.json ./
RUN npm install --only=production

# EXPOSE 3000 # Will be done later

CMD ["node", "dist/index.js"]