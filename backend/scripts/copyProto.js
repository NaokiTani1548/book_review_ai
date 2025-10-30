import fs from "fs";
import path from "path";

const src = path.resolve("src/proto");
const dest = path.resolve("dist/proto");

fs.cpSync(src, dest, { recursive: true });

console.log("✅ Copied proto files from src → dist");
