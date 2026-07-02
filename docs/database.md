Docker is required to run PostgreSQL on local.
This script will download docker image, run the container and create the database.

```bash
./install.sh
```

===

The source of truth is the TypeScript schema in `libs/db/src/schema/`, not Drizzle Studio.

Normal workflow:

1. Edit or add table definitions manually in `libs/db/src/schema/`.
   - New table: add a file like `libs/db/src/schema/users.ts`.
   - Export it from `libs/db/src/schema/index.ts`.
   - Alter table: update the existing table file, e.g. `libs/db/src/schema/plants.ts`.

2. Generate a SQL migration from the TS schema:

```bash
npx nx run db:generate
```

This compares the Drizzle schema to the previous snapshot and creates a new SQL migration in `libs/db/migrations/`.

3. Regenerate the ER diagram (Mermaid) for docs:

```bash
npx nx run db:diagram
```

This writes `docs/database-schema.mmd` from the TypeScript schema. Preview it in VS Code with a Mermaid extension, or paste the file into [mermaid.live](https://mermaid.live).

4. Review the generated SQL migration.

5. Apply it to your local database:

```bash
npx nx run db:migrate
```

6. Use the inferred TS types from the schema in backend code:

```ts
import { plants, type Plant, type NewPlant } from '@plant-doctor/db';
```

Drizzle Studio is mainly for inspecting and editing data locally:

```bash
npx nx run db:studio
```

I would not use Studio as the primary way to design schema changes. If you change the DB directly through Studio or raw SQL, the TS schema will not automatically update, and you can create drift. Best practice here is: **edit TS schema first, generate SQL migration, apply migration**.

For Python later, it should connect to the same DB and rely on the committed SQL migrations. It should not own a separate migration history unless you intentionally change the architecture.