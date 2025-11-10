# Packmind contribution guide

## Starting the stack:

You will need node 22.17 and docker to start the development stack:

```shell
nvm use
npm i
npm run chakra:typegen
PACKMIND_EDITION=oss node scripts/select-tsconfig.mjs
docker compose up
```

The app should be available at [http://localhost:4200](http://localhost:4200)
