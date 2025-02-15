FROM node:18-alpine AS build  
WORKDIR /app  

COPY . .  

RUN npm install  
RUN npm run build  

FROM node:18-slim  
WORKDIR /app  

COPY --from=build /app /app  

CMD ["node", "dist/index.js"]
