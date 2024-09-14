# Use the official Node.js image as the base image
FROM node:18

# Install build tools and set C++ standard
RUN apt-get update && apt-get install -y build-essential g++ \
    && rm -rf /var/lib/apt/lists/*  
ENV CXXFLAGS="-std=c++17"  

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

RUN npm install

RUN npm install better-sqlite3

# Copy the rest of the application code to the working directory
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "--trace-warnings", "main.js"]
