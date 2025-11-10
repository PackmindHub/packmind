# Packmind contribution guide

## Starting the stack:

You will need node 22 and docker to start the development stack:

```shell
nvm use
PACKMIND_EDITION=oss node scripts/select-tsconfig.mjs
docker compose up
```

The app should be available at [http://localhost:4200](http://localhost:4200)

## Environment Configuration

The project uses a `compose.env` file to configure environment variables for Docker Compose services. A default `compose.env` file is provided with safe defaults for local development.

To customize your environment:

1. Edit `compose.env` directly, or
2. Copy `compose.env.example` to `compose.env` and customize as needed
3. Set sensitive values (like `OPENAI_API_KEY`) in the file

The `compose.env` file is tracked in git with safe defaults. If you add sensitive information, ensure you don't commit those changes.
