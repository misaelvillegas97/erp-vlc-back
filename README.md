# Base Microservice

Base microservice built with NestJS, PostgreSQL, TypeORM, and Redis for SaaS inventory system.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Contributing](#contributing)
- [License](#license)

## Prerequisites

- Node.js >= 21.x
- Docker and Docker Compose
- Redis Server
- PostgreSQL Server

## Installation

First, clone the repository:

```bash
git clone https://github.com/appli-io/inventory-base.git
```

Navigate into the directory:

```bash
cd inventory-base
```

Install the dependencies:

```bash
npm install
```

## Running the App

### Using Docker

To start all services:

```bash
docker-compose up --build
```

### Manually

First, start the Redis and PostgreSQL services. Then:

To run in development mode:

```bash
npm run start:dev
```

To run in production mode:

```bash
npm run build
npm run start:prod
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
