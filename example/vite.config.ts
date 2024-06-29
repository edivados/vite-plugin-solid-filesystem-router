import solidFileSystemRouter from "@edivados/vite-plugin-solid-filesystem-router";
import path from "node:path";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  resolve: {
    alias: {
      "~": path.join(__dirname, "src"),
    },
  },
  plugins: [
    solid({ extensions: [".jsx", ".tsx"] }),
    solidFileSystemRouter(),
  ]
});
