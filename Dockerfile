# 1. Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Accept build arguments for Vite (Frontend environment variables)
# These are passed via --build-arg (or cloudbuild.yaml substitutions)
ARG API_KEY
ARG VITE_GOOGLE_CLIENT_ID

# Set them as environment variables so Vite can inline them during the build process
ENV API_KEY=$API_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Build the React application (Output goes to /dist)
RUN npm run build

# 2. Production Stage
FROM node:18-alpine

WORKDIR /app

# Copy package.json to install production dependencies
COPY package*.json ./

# Install only production dependencies to keep the image small
RUN npm install --omit=dev

# Copy the built frontend assets from the builder stage
COPY --from=builder /app/dist ./dist

# Copy the server code
COPY --from=builder /app/server ./server

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose the port
EXPOSE 8080

# Start the Express server
CMD ["node", "server/index.js"]