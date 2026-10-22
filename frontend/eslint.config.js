import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      boundaries,
    },
    settings: {
      "boundaries/elements": [
        { type: "core", pattern: "src/core/*" },
        { type: "shared", pattern: "src/shared/*" },
        { type: "modules", pattern: "src/modules/*", capture: ["module"] },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "boundaries/element-types": [
        "error",
        {
          default: "disallow",
          rules: [
            { from: "core", allow: ["core", "shared"] },
            { from: "shared", allow: ["shared"] },
            { from: "modules", allow: ["core", "shared", ["modules", { module: "${from.module}" }]] },
          ],
        },
      ],
    },
  },
);
