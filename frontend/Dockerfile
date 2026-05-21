FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --silent

COPY . .

ARG REACT_APP_API_URL=http://localhost:8002
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Production: nginx ile sun
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html

# React Router için fallback
RUN echo 'server { \
  listen 3000; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
