/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig
```

---

## Passo 3: Criar .dockerignore

Cria o arquivo `.dockerignore` na raiz:
```
node_modules
.next
.git
.gitignore
README.md
.env*.local