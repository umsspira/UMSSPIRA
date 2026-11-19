import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const destination = new URL("../public/ocr/models/", import.meta.url);
await mkdir(destination, { recursive: true });
const pinned = JSON.parse(
  await readFile(new URL("manifest.json", destination), "utf8"),
);
const manifest = [];
for (const model of ["PP-OCRv6_small_det", "PP-OCRv6_small_rec"]) {
  const url = `https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/${model}_onnx_infer.tar`;
  const path = new URL(`${model}.tar`, destination);
  let bytes;
  try {
    bytes = await readFile(path);
  } catch {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Model download failed: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(path, bytes);
  }
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  if (pinned.find((entry) => entry.model === model)?.sha256 !== sha256)
    throw new Error(`Model checksum mismatch: ${model}`);
  manifest.push({ model, url, bytes: bytes.length, sha256 });
}
await writeFile(
  new URL("manifest.json", destination),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log("Spanish-compatible OCR models available locally.");
