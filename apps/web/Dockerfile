FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

EXPOSE 3000

# Development mode with hot reload
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0"]
