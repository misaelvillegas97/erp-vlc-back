###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM node:20-alpine As development

# Create app directory
WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm ci

COPY --chown=node:node . .

USER node

###################
# BUILD FOR PRODUCTION
###################

FROM node:20-alpine As build

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node --from=development /usr/src/app/2captcha-solver ./2captcha-solver

COPY --chown=node:node . .

RUN npm run build

ENV NODE_ENV production

RUN npm ci --only=production && npm cache clean --force

USER node

###################
# PRODUCTION
###################

FROM node:20-alpine As production

RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    libx11-xcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxi6 \
    libxtst6 \
    libnss3 \
    libcups2 \
    libxss1 \
    libxrandr2 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libdrm2 \
    libgbm1 \
    libxshmfence1 \
    libglu1-mesa \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/2captcha-solver ./2captcha-solver
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

CMD [ "node", "--max_old_space_size=250", "--gc_interval=100", "--optimize-for-size", "dist/main.js" ]
