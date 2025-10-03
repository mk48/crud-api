## install

> pnpm i
> pnpm approve-builds

## run the app:

> SET DEBUG=cursed-crud-api:\* & pnpm start

## migration

init migration file

> pnpm knex init

create new migration file

> pnpm knex migrate:make _name_

run migration

> pnpm knex migrate:run

## Seed

create seed file

> pnpm knex seed:make _name_

run one seed file

> pnpm knex seed:run --specific=seed-filename.js
