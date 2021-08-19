FROM node:latest
WORKDIR /app
COPY ./package.json .
COPY ./package-lock.json .
COPY ./vite.config.ts .
COPY ./tsconfig.json .
COPY ./index.html .
COPY ./.env.DEV .
RUN npm install
CMD ["npm", "run-script", "dev"]
