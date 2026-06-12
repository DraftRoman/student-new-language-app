# Language App — Developer Guide

This project is a React + TypeScript language learning app using Vite.  
It is fully containerized with Docker, so all dependencies are installed in the container.

This guide is for new contributors to get started quickly.

---

1. Prerequisites

- Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
- Install [Git](https://git-scm.com/)

---

2. Clone the repository

Have to ask to have access.

```bash
git clone https://github.com/DraftRoman/project-languages.git
cd project-languages
```

3. Quick Commands

# Start the project

docker compose up --build

# Stop the project

docker compose down

# Rebuild containers

docker compose build --no-cache
docker compose up

# Run tests

docker exec -it language-app-frontend npm run test

4. Project structure

project-languages/
├─ frontend/ # React + Vite frontend
│ ├─ src/ # source code (components, hooks, logic)
│ ├─ public/ # static files (JSON dictionaries, images)
│ ├─ package.json
│ ├─ Dockerfile
│ └─ vite.config.ts
└─ docker-compose.yml

5. Run the project with Docker

All dependencies and Node.js are handled by Docker.

```bash
docker compose up --build
```

Open the app in browser: http://localhost:5173
Hot reload works automatically when editing frontend/src

6. Stop the project

```bash
docker compose down
```

7. Rebuild containers

```bash
docker compose build --no-cache
docker compose up
```

8. Running tests

We use Vitest for unit and component testing.

# run tests inside the frontend container

docker exec -it language-app-frontend npm run test

9. Adding new dependencies

Install new packages inside the container:

docker exec -it language-app-frontend npm install <package-name>
After installing, you may need to rebuild the container:

docker compose build --no-cache
docker compose up

10. Contributing workflow

- Edit code in frontend/src/
- Add new features/components:
  - Components → frontend/src/components/
  - Hooks → frontend/src/hooks/
  - Services/logic → frontend/src/services/
- Add new dictionary JSON files → frontend/public/
- Write tests alongside your code:
  - e.g., MyComponent.tsx → MyComponent.test.tsx

Run tests:

      docker exec -it language-app-frontend npm run test

Commit your changes following Git workflow

11. Notes & Best Practices

Node version is handled by Docker (Node 20+)
Do not commit:

- node_modules/
- .env files
- dist/ folder
  Ensure JSON dictionaries are inside frontend/public/ to be accessible by fetch
  Use hot reload to check changes instantly
  Keep components small and reusable
  Write tests for new features whenever possible
