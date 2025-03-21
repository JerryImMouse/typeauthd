FROM node:18-alpine AS build  
WORKDIR /app  

COPY package*.json ./  

RUN npm ci  

COPY . .  

RUN npm run build  

FROM node:18-slim  
WORKDIR /app  

COPY --from=build /app /app  

RUN npm ci --omit=dev  

CMD ["node", "dist/index.js"]
