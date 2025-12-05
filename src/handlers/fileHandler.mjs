import fs from "fs";
import readline from "readline";
import CliError from "../utils/Error.mjs";

/**
 * Async generator that streams wordlist line-by-line
 */
export async function* streamWordlist(path,workerId=0,totalWorkers=1) {
  if (!path) {
    throw new CliError({
      isKnown: true,
      message: 'Wordlist path is required',
      category: 'validation',
      code: 'MISSING_WORDLIST'
    });
  }

  // ✅ FIRST: validate file exists and is readable
  try {
    await fs.promises.access(path, fs.constants.R_OK);
  } catch (error) {
    throw new CliError({
      isKnown: true,
      message: `Wordlist file not found or not readable: ${path}`,
      code: error.code || 'ENOENT',
      category: 'validation',
      url: path,
      detail: {
        suggestion: 'Please check the file path and ensure the file exists and is readable.'
      }
    });
  }

  // Check if it's a file (not a directory)
  try {
    const stats = await fs.promises.stat(path);
    if (!stats.isFile()) {
      throw new CliError({
        isKnown: true,
        message: `Wordlist path is not a file: ${path}`,
        code: 'EISDIR',
        category: 'validation',
        url: path
      });
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError({
      isKnown: true,
      message: `Cannot access wordlist file: ${path}`,
      code: error.code || 'EACCES',
      category: 'validation',
      url: path,
      originalError: error
    });
  }

  let stream;
  let rl;
  let index = 0;
  let hasYielded = false;

  try {
    stream = fs.createReadStream(path, { encoding: "utf-8" });
    rl = readline.createInterface({
      input: stream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      const payload = line.trim();
      if(!payload) continue;

      //  SHARDING LOGIC
      if(index%totalWorkers===workerId){
        hasYielded = true;
        yield payload;
      }
      index++;
    }

    // If no lines were yielded, warn but don't error
    if (!hasYielded && workerId === 0) {
      // Only warn from first worker to avoid spam
      if (index === 0) {
        throw new CliError({
          isKnown: true,
          message: `Wordlist file is empty: ${path}`,
          category: 'validation',
          url: path
        });
      }
    }
  } catch (error) {
    // Cleanup on error
    if (rl) rl.close();
    if (stream) stream.destroy();
    
    if (error instanceof CliError) {
      throw error;
    }
    
    throw new CliError({
      isKnown: true,
      message: error?.message || "Wordlist stream failed",
      code: error?.code || "READ_STREAM_ERROR",
      category: "READ_FILE",
      originalError: error,
      url: path,
      detail: {
        suggestion: 'Please check that the file is readable and not corrupted.'
      }
    });
  } finally {
    if (rl) rl.close();
    if (stream) stream.destroy();
  }
}
