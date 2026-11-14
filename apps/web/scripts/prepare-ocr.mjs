import { createRequire } from "node:module";
import { realpathSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { mkdir, readdir, copyFile } from "node:fs/promises";
// dev and build both run this preparation before starting Next.
await import("./download-ocr-models.mjs");
const require = createRequire(import.meta.url);
const sdk = resolve("node_modules/@paddleocr/paddleocr-js/dist");
const sdkRequire = createRequire(realpathSync(resolve(sdk, "../package.json")));
const ort = dirname(sdkRequire.resolve("onnxruntime-web"));
const destination = resolve("public/ocr/runtime");
await mkdir(destination, { recursive: true });
for (const file of await readdir(ort)) {
  if (
    file.endsWith(".wasm") ||
    (file.startsWith("ort-wasm") && file.endsWith(".mjs"))
  )
    await copyFile(resolve(ort, file), resolve(destination, file));
}
const pdf = dirname(require.resolve("pdfjs-dist/package.json"));
await copyFile(
  resolve(pdf, "build/pdf.worker.min.mjs"),
  resolve(destination, "pdf.worker.min.mjs"),
);
console.log("OCR runtime assets prepared locally.");

const assets = resolve(sdk, "assets");
for (const name of await readdir(assets)) {
  if (name.startsWith("worker-entry-") && name.endsWith(".js"))
    await copyFile(
      resolve(assets, name),
      resolve(destination, "paddle-worker.js"),
    );
  else await copyFile(resolve(assets, name), resolve(destination, name));
}

// Next 14's asset minifier does not understand ONNX ESM workers. Serve the pinned SDK as native ESM.
const { build } = require("esbuild");
await copyFile(
  resolve(ort, "ort.bundle.min.mjs"),
  resolve(destination, "ort.bundle.min.mjs"),
);
await build({
  entryPoints: [resolve(sdk, "index.mjs")],
  outfile: resolve(destination, "sdk.mjs"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
  plugins: [
    {
      name: "browser-runtime",
      setup(build) {
        build.onResolve({ filter: /^onnxruntime-web(?:\/.*)?$/ }, () => ({
          path: "/ocr/runtime/ort.bundle.min.mjs",
          external: true,
        }));
        build.onResolve({ filter: /^(fs|path|crypto)$/ }, (args) => ({
          path: args.path,
          namespace: "empty-node",
        }));
        build.onLoad({ filter: /.*/, namespace: "empty-node" }, () => ({
          contents: "export default {};",
          loader: "js",
        }));
      },
    },
  ],
});
