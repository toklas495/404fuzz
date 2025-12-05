import fs from "fs";
import readline from "readline";
import CliError from "../utils/Error.mjs";
import theme from "../utils/theme.mjs";

/**
 * Async generator that streams wordlist line-by-line
 */
export async function* streamWordlist(path) {
  if (!path) return;

  // ✅ FIRST: validate file exists
  try {
    await fs.promises.access(path, fs.constants.R_OK);
  } catch {
    console.log(theme.warn(`Warning: Wordlist file not found → ${path}`));
    return;
  }

  const stream = fs.createReadStream(path, { encoding: "utf-8" });
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  try {
    for await (const line of rl) {
      const payload = line.trim();
      if (payload.length > 0) {
        yield payload; // ✅ one payload at a time
      }
    }
  } catch (error) {
    throw new CliError({
      isKnown: false,
      message: error?.message || "Wordlist stream failed",
      code: error?.code || "READ_STREAM_ERROR",
      category: "READ_FILE",
      originalError: error,
      url: path
    });
  }
}
