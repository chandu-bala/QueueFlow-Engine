# 🌊 QueueFlow-Engine

This repository contains the source code for the QueueFlow-Engine project. It's a system designed with a microservices architecture, featuring a main **API** service, a background **Worker** service, and a **Database** for migrations.

## Project Structure

* `docker-compose.yml`: Defines and runs the multi-container Docker application.
* `api/`: The main Node.js API server.
* `worker/`: The background Node.js worker/consumer service.
* `migrations/`: SQL files for database schema management.

## 🛠️ Quick Setup (Docker)

To run this project locally, ensure you have **Docker** and **Docker Compose** installed.

1.  Clone the repository:
    ```bash
    git clone [https://github.com/chandu-bala/QueueFlow-Engine.git](https://github.com/chandu-bala/QueueFlow-Engine.git)
    cd QueueFlow-Engine
    ```
2.  Build and start the containers:
    ```bash
    docker-compose up --build
    ```