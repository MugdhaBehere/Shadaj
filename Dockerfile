# 1. Use Node.js LTS (Long Term Support) as the base image
FROM node:18-alpine

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package files first to leverage Docker cache for dependencies
COPY package*.json ./

# 4. Install dependencies
RUN npm install

# 5. Copy the rest of the application code
COPY . .

ARG API_KEY
ARG VITE_GOOGLE_CLIENT_ID

# 7. Set Environment Variables for the build process
ENV API_KEY=$API_KEY
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# 8. Build the frontend (creates the /dist folder)
RUN npm run build

# 9. Expose the port the app runs on (matching server/index.js)
EXPOSE 5000

# 10. Start the Express server
CMD ["node", "server/index.js"]