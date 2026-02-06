# Stage 1: Build the frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# 1. Accept build arguments defined in cloudbuild.yaml
ARG API_KEY
ARG VITE_GOOGLE_CLIENT_ID

# 2. Set them as environment variables so Vite can use them during build
ENV API_KEY=$API_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build the application (creates the 'dist' folder)
RUN npm run build

# Stage 2: Run the production server
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the built frontend assets from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the server code
COPY --from=builder /app/server ./server

# Cloud Run sets PORT to 8080 by default
ENV PORT=8080

# Start the Express server
CMD ["npm", "start"]