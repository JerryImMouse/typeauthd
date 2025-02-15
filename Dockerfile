FROM node:18-alpine AS build  
WORKDIR /app  

COPY package*.json ./ 
RUN npm install  

COPY . .  
RUN npm run build  

FROM node:18-slim  
WORKDIR /app  

COPY --from=build /app /app  

RUN rm -rf node_modules  

RUN npm install 

CMD ["node", "dist/index.js"]

