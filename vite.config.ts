import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Base path: default to /<repo>/ on CI (project Pages site), or "/" locally. The preview
// workflow overrides it with BASE_PATH=/<repo>/preview/<branch>/ so branch builds resolve their
// assets under the preview subdirectory.
const repoBase = process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split("/")[1]}/` : "/";

export default defineConfig({
  base: process.env.BASE_PATH || repoBase,
  plugins: [react()],
});
