# 1. Use Node.js LTS
FROM node:18-alpine

# 2. Set working directory
WORKDIR /app

# 3. Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# 4. Copy the rest of the application code
COPY . .

# 5. Define Build Arguments for Frontend (Vite)
# These must be passed via --build-arg during docker build
ARG API_KEY
ARG VITE_GOOGLE_CLIENT_ID

# 6. Set Environment Variables for the build process
ENV API_KEY=$API_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID


# 7. Build the frontend
RUN npm run build

# 8. Expose the backend port
EXPOSE 5000

# 9. Start the Express server
CMD ["node", "server/index.js"]