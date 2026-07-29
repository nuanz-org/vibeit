# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `web`: a [Next.js](https://nextjs.org/) app (port `3000`)
- `docs`: a [Next.js](https://nextjs.org/) app (port `3001`)
- `@repo/api`: a [FastAPI](https://fastapi.tiangolo.com/) backend (port `8000`)
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `eslint-config-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

## FastAPI + Next.js

This monorepo runs Next.js and FastAPI together through Turborepo.

```
pnpm dev
    │
 Turbo
/     \
web      @repo/api
:3000     :8000
```

JavaScript apps use **pnpm**. The API uses **uv** for Python dependencies. `apps/api/package.json` only exists so Turbo can run the FastAPI command.

### Prerequisites

- Node.js `>=18`
- [pnpm](https://pnpm.io/) `9`
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- Python `>=3.12`

### Install

```sh
# JS / workspace deps
pnpm install

# Python deps for the API
cd apps/api
uv sync
cd ../..
```

### Run everything

From the repo root:

```sh
pnpm dev
```

That starts:

| App | URL |
|-----|-----|
| `web` (Next.js) | http://localhost:3000 |
| `docs` (Next.js) | http://localhost:3001 |
| `@repo/api` (FastAPI) | http://localhost:8000 |

Useful API URLs:

- Health: http://localhost:8000/health
- Hello: http://localhost:8000/api/hello
- Swagger docs: http://localhost:8000/docs

### Run apps individually

```sh
# Next.js web only
pnpm --filter web dev

# FastAPI only
pnpm --filter @repo/api dev
```

Or run FastAPI directly with uv:

```sh
cd apps/api
uv run fastapi dev src/main.py --port 8000
```

### Dependency ecosystems

| Ecosystem | Tool | Config | Lockfile |
|-----------|------|--------|----------|
| JavaScript | pnpm | `package.json` | `pnpm-lock.yaml` |
| Python | uv | `apps/api/pyproject.toml` | `apps/api/uv.lock` |

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo build
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo build
pnpm dlx turbo build
pnpm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo build --filter=docs
```

Without global `turbo`:

```sh
npx turbo build --filter=docs
pnpm exec turbo build --filter=docs
pnpm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo dev
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo dev
pnpm exec turbo dev
pnpm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo dev --filter=web
```

Without global `turbo`:

```sh
npx turbo dev --filter=web
pnpm exec turbo dev --filter=web
pnpm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
pnpm exec turbo login
pnpm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
pnpm exec turbo link
pnpm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
