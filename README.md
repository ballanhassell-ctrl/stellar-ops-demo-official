# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

While this project uses React, Vite supports many popular JS frameworks. [See all the supported frameworks](https://vitejs.dev/guide/#scaffolding-your-first-vite-project).

## Deploy Your Own

Deploy your own Vite project with Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/examples/tree/main/framework-boilerplates/vite-react&template=vite-react)

_Live Example: https://vite-react-example.vercel.app_

### Deploying From Your Terminal

You can deploy your new Vite project with a single command from your terminal using [Vercel CLI](https://vercel.com/download):

```shell
$ vercel
```

## Codex setup script and lockfile safety

To avoid patch application failures in Codex runs, keep setup scripts and agent work from modifying the same files.

- Do **not** run `npm install` or `npm ci` in setup scripts when the task is expected to update dependencies or run lockfile-changing commands (for example, `npm audit fix`).
- Let the agent run dependency installation as part of the task workflow when `package-lock.json` must change.
- If setup must run `npm install` for another reason, agent tasks should either avoid dependency changes or restore the post-setup lockfile state before commit.
- General rule: setup scripts and agent patches should touch different files whenever possible.
