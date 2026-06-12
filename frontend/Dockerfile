# Use official Node.js image
FROM node:20

# Set working directory
WORKDIR /app

# Copy dependency files first (better layer caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start Vite dev server
CMD ["npm", "run", "dev"]