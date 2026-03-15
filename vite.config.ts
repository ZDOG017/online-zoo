import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

const currentDirectoryPath = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        landing: resolve(currentDirectoryPath, "online-zoo/pages/landing/index.html"),
        signin: resolve(currentDirectoryPath, "online-zoo/pages/signin/index.html"),
        map: resolve(currentDirectoryPath, "online-zoo/pages/map/index.html"),
        contact: resolve(currentDirectoryPath, "online-zoo/pages/contact/index.html"),
        panda: resolve(currentDirectoryPath, "online-zoo/pages/zoos/panda/index.html"),
        eagles: resolve(currentDirectoryPath, "online-zoo/pages/zoos/eagles/index.html"),
        gorilla: resolve(currentDirectoryPath, "online-zoo/pages/zoos/gorilla/index.html"),
        lemur: resolve(currentDirectoryPath, "online-zoo/pages/zoos/lemur/index.html")
      }
    }
  }
});
