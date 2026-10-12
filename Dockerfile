# Use lightweight Node.js 20 Alpine Linux image
FROM node:20-alpine

WORKDIR /app

# Copy application files
COPY package.json ./
COPY server.js app.js index.html styles.css ./

# Production defaults
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]
