# 🏢 Sistema de Condomínio — PI2

Projeto desenvolvido para o Projeto Integrador 2.

---

## 📌 Pré-requisitos

Antes de rodar o projeto, você precisa ter instalado:

- Git
- Node.js (versão LTS recomendada)
- VS Code (opcional, mas recomendado)

Para verificar se já possui Git e Node instalados, abra o terminal e rode:

    git --version
    node -v
    npm -v

Se não tiver instalado:

Git: https://git-scm.com/  
Node.js: https://nodejs.org/  
VS Code: https://code.visualstudio.com/

---

## 🚀 Como rodar o projeto

1️⃣ Clonar o repositório:

    git clone LINK_DO_REPOSITORIO
    cd NOME_DA_PASTA

2️⃣ Entrar na pasta do frontend:

    cd apps/web

(Se o frontend estiver na raiz do projeto, ignore este passo.)

3️⃣ Instalar as dependências:

    npm install

4️⃣ Rodar o projeto:

    npm run dev

Após rodar, abrir no navegador:

    http://localhost:5173

---

## 🔐 Login de teste (mock)

Enquanto o backend não está implementado, utilizar:

Admin:
Email: admin@condominio.com  
Senha: 123456  

Morador:
Email: morador@condominio.com  
Senha: 123456  

---

## 📂 Estrutura básica do projeto

Dentro da pasta src:

- pages → Telas do sistema
- routes → Configuração de rotas e proteção
- services → Regras de negócio (ex: login mock)
- styles → Padrão visual e tokens

---

## 🌿 Fluxo de trabalho do grupo

- Não trabalhar direto na main
- Criar branch feature/nome-da-tarefa
- Abrir Pull Request para dev
- Após revisão, realizar merge
