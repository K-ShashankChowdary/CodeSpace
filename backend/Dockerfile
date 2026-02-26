# Use a lightweight Alpine Linux base image that has Node.js pre-installed
FROM node:20-alpine

# Install the C++ compiler (g++) inside this isolated container
RUN apk update && apk add --no-cache g++

# Create a directory inside the container to hold our application
WORKDIR /app

# Copy package.json and package-lock.json first (for caching efficiency)
COPY package*.json ./

# Install Node dependencies
RUN npm install

# Copy the rest of your backend source code into the container
COPY . .

# Set the command to start exactly the worker (not the Express API)
CMD ["node", "src/worker.js"]
