# Virtual Pub Global Matrix

Developer quickstart

1. Install dependencies:

```bash
npm install
```

2. Create `.env` (copy from `.env.example` or fill values referenced in `apps/*/src/config/env.ts`).

3. Typecheck and build:

```bash
npm run typecheck
npm run build
```

4. Start dev servers:

```bash
npm run dev
# or just one app
npm run dev:api
npm run dev:bot
npm run dev:ui
```

5. Lint and format:

```bash
npm run lint
npm run lint:fix
npm run format
```
