import fs from "fs";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// ✅ IMPORT INTERNAL PARSER (NO TEST FILE)
const pdfParse = require("pdf-parse/lib/pdf-parse.js");

export const parsePDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
};
