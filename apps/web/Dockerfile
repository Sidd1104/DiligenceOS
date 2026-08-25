FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

# Pre-build Next.js app for instant page rendering performance
ENV NEXT_PUBLIC_API_URL=http://localhost:8000
RUN npm run build

EXPOSE 3000

# Fast production server
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0"]

