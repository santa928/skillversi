FROM node:20-alpine

WORKDIR /app

# Install dependencies if package.json exists
# (Will be populated later)

CMD ["npm", "run", "dev", "--", "--host"]
