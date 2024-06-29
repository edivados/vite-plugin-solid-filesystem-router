# Vite Plugin Solid Filesystem Router

SolidStart's filesystem router as standalone Vite plugin intended for use in single page application (SPA).

Implementation taken from [SolidStart](https://github.com/solidjs/solid-start) and [Vinxi](https://github.com/nksaraf/vinxi).

## Installation

```
npm install @edivados/vite-plugin-solid-filesystem-router
```

## Usage

```ts
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import solidFilesystemRouter from "@edivados/vite-plugin-solid-filesystem-router";

export default defineConfig({
  plugins: [
    solid(),
    solidFilesystemRouter()
  ]
});
```

## Options

### options

- Type: Object
- Default: {}

#### options.dir

- Type: string
- Default: 'src/routes'

Directory where to look for route files.

#### options.extensions

- Type: string[]
- Default: ['jsx', 'tsx']

An array of file extensions to be picked up as routes. By defualt only `jsx` and `tsx` are picked up.

#### options.router

- Type: BaseFileSystemRouter
- Defualt: undefined

Custom filesystem router implementation. `dir` and `extensions` option will be ignored if present. For more information see [Vinxi](https://vinxi.vercel.app/guide/file-system-routing.html) and [SolidStart](https://github.com/solidjs/solid-start/blob/main/packages/start/config/fs-router.js).