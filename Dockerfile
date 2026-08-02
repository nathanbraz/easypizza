FROM node:22-alpine

WORKDIR /app

# Copia os arquivos de dependência primeiro (para usar o cache do Docker)
COPY package.json package-lock.json ./
RUN npm install

# Copia o restante do código
COPY . .

# Expõe a porta que o Vite utiliza por padrão
EXPOSE 3333

# O comando para iniciar em modo de desenvolvimento (com Hot Reload!)
CMD ["npm", "run", "dev", "--", "--host"]
