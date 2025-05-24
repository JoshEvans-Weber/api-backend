# FamilyChoreTV API Backend (Dockerized)

This folder contains a ready-to-launch Docker Compose setup for both MariaDB and the Node.js API backend.

## Usage

1. **Edit credentials** in `docker-compose.yml` and `server.js` if needed.
2. Place this folder (`api-backend`) in your project root.
3. From inside this folder, run:

   ```powershell
   docker-compose up --build
   ```

4. The API will be available at `http://localhost:8080/api/chores` (or your server's IP).

## Files
- `docker-compose.yml`: Orchestrates MariaDB and API containers
- `Dockerfile`: Builds the Node.js API container
- `package.json`: Node.js dependencies
- `server.js`: Express API server

## Database
- MariaDB will be initialized with the database `FamilyChoreTV` and user `familychore`.
- The API connects to MariaDB using Docker networking (`mariadb` as host).

## Security
- For production, change all passwords and consider using `.env` files.
