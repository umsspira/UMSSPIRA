import { mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const destination = new URL("../public/ocr/models/", import.meta.url);
await mkdir(destination, { recursive: true });
const pinned = JSON.parse(
  await readFile(new URL("manifest.json", destination), "utf8"),
);
const checksum = (bytes) => createHash("sha256").update(bytes).digest("hex");
for (const model of ["PP-OCRv6_small_det", "PP-OCRv6_small_rec"]) {
  const url = `https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0/${model}_onnx_infer.tar`;
  const path = new URL(`${model}.tar`, destination);
  const expected = pinned.find((entry) => entry.model === model)?.sha256;
  if (!expected) throw new Error(`Missing pinned checksum: ${model}`);
  let bytes;
  try {
    bytes = await readFile(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!bytes || checksum(bytes) !== expected) {
    console.log(`Downloading OCR model: ${model}`);
    const response = await fetch(url, { signal: AbortSignal.timeout(180000) });
    if (!response.ok)
      throw new Error(`Model download failed: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
    if (checksum(bytes) !== expected)
      throw new Error(`Model checksum mismatch: ${model}. Retry the startup command.`);
    await writeFile(path, bytes);
  }
}
console.log("Spanish-compatible OCR models available locally.");
