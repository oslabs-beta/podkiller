FROM node:18

# Install iproute2 (tc command)
RUN apt-get update && apt-get install -y iproute2 && rm -rf /var/lib/apt/lists/*

# Verify tc is installed
RUN which tc

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY demo-app.js ./

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["npm", "start"]