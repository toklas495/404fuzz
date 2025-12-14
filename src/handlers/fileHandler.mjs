import fs from "fs";
import readline, { createInterface } from "readline";
import CliError from "../utils/Error.mjs";
import theme from "../utils/theme.mjs";

/**
 * Async generator that streams wordlist line-by-line
 */
export async function* streamWordlist(path, workerId = 0, totalWorkers = 1) {
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
      if (!payload) continue;

      //  SHARDING LOGIC
      if (index % totalWorkers === workerId) {
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


export function outputStream(filename) {
  try {
    // create writable stream with highwatermark for better performance
    // use 'w' flag to overwrite file (faster than append for streaming)
    const outputStream = fs.createWriteStream(filename, {
      flags: "w", // overwrite mode faster for streaming
      encoding: "utf-8",
      highWaterMark: 64 * 1024  // 64 kb buffer for better performance
    });

    return outputStream;
  } catch (error) {
    throw new CliError({
      isKnown: true,
      message: `Cannot create output file: ${filename}`,
      category: "validation",
      code: error?.code,
      originalError: error
    })
  }
}


export function outputWrite(outputWriteStream, data) {
  // chain write to ensure only one write happen at time;
  if (outputWriteStream) {
    if (!outputWriteStream.write(data)) {
      // Buffer full -> apply backpressure
      return new Promise(resolve => {
        outputWriteStream.once("drain", resolve);
      })
    }
    return Promise.resolve();
  } else {
    if (!process.stdout.write(data)) {
      return new Promise(resolve => {
        process.stdout.once("drain", resolve);
      })
    }
    return Promise.resolve();
  }
}



export async function payloadCount(path) {
  let count = 0;
  try {
    const fileStream = fs.createReadStream(path, { encoding: "utf-8" });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    })

    for await (const line of rl) {
      if (line.trim()) count++;
    }
    return count;
  } catch (error) {
    // if we cant count, use a default
    return count;
  }
}


function parseRawRequest(lines){
  if(lines.length===0) return null;

  // find first non empty line (request line);
  let startIndex = 0;
  while(startIndex<lines.length&&!lines[startIndex].trim()){
    startIndex++;
  }

  if(startIndex>lines.length) return null;

  // parse request line: Method|path|http version
  const requestline = lines[startIndex].trim();
  const [method,path,protocol] = requestline.split(/\s+/);
  if(!method||!path){
    process.stdout.write(theme.warn(`Invalid reqeust line: ${requestline}`));    
  }

  // parse header (stop at empty line or end);

  const headers = [];
  let host = '';
  let bodyStartIndex = startIndex+1;

  for(let i=startIndex+1;i<lines.length;i++){
    const line = lines[i];

    // empty line mark for headers
    if(!line.trim()){
      bodyStartIndex = i+1;
      break;
    }

    // parse header
    const colonIndex = line.indexOf(":");
    if(colonIndex>0){
      const name = line.substring(0,colonIndex).trim();
      const value = line.substring(colonIndex+1).trim();

      //  store host seperately for url construction
      if(name.toLowerCase()==='host'){
        host = value;
      }

      headers.push(`${name}:${value}`);
    }
  }

  // parse body after header 
  let body = null;
  if(bodyStartIndex<lines.length){
    const bodyLines = lines.slice(bodyStartIndex).filter(l=>l.trim());
    if(bodyLines.length>0){
      body = bodyLines.join("\n");
    }
  }

  // construct url
  let url = '';
  if(host){
    // determine protocol from host header or default to https
    const isHttps = !host.includes(":80")&&!host.includes('localhost');
    const schema = isHttps?"https":"http";
    url = `${schema}://${host}${path}`
  }else{
    // no host header - just use path (migh fail letter);
    url = path;
  }

  return {
    method:method.toUpperCase(),
    url:url,
    headers:headers,
    data:body,
    rawRequest:lines.join('\n') // keep original from references 
  }

}


export async function parseRequestFile(argv) {
  const {request:filepath} = argv;
  if (!filepath) {
    throw new CliError({
      isKnown: true,
      message: "filepath is required",
      category: "validation",
      code: error?.code || "NOTFOUND"
    })
  }

  try {
    await fs.promises.access(filepath, fs.constants.R_OK);
  } catch (error) {
    throw new CliError({
      isKnown: true,
      code: error?.code || "ENOENT",
      category: "validation",
      url: filepath,
      message: `request file not found or readable: ${filepath}`,
      detail: {
        suggestion: "Please check the file path ensure the file exit or readable!"
      }
    })
  }

  try {
    const stat = await fs.promises.stat(filepath);
    if (!stat.isFile()) {
      throw new CliError({
        isKnown: true,
        message: `filepath is not a file: ${filepath}`,
        category: "validation",
        code: error?.code || "EISDIR",
        url: path
      })
    }
  } catch (error) {
    if (error instanceof CliError) throw error;
    throw new CliError({
      isKnown: true,
      message: `cannot access request file: ${filepath}`,
      category: "validation",
      code: error?.code || "EACCESS",
      url: filepath,
      originalError: error
    })
  }



  let filestream;
  let rl;
  let requests = [];
  let currentRequest = [];

  try {
    filestream = fs.createReadStream(filepath,{encoding:"utf-8"});
    rl = createInterface({
      input:filestream,
      crlfDelay:Infinity
    })

    for await (const line of rl){
      if(line.trim()==="@TOKLAS@"){
        if(currentRequest.length>0){
          // parse accumlated line as a request
          const parsed = parseRawRequest(currentRequest);
          if(parsed){
            requests.push({...parsed,...argv});
          }
          currentRequest = [];
        }
      }else{
        currentRequest.push(line);
      }
    }

    if(currentRequest.length>0){
      const parsed = parseRawRequest(currentRequest);
      if(parsed){
        requests.push({...parsed,...argv});
      }
    }
    return requests;
  } catch (error) {
    if(filestream) filestream.destroy();
    if(rl) rl.close();

    if(error instanceof CliError) throw error;
    throw new CliError({
      isKnown:true,
      message:error?.message||"file stream failed",
      code:error?.code||"READ_STREAM",
      category:"read_file",
      originalError:error,
      detail:{
        suggestion:"please check the file is readable and not corrupted!"
      }
    })
  }finally{
    if(filestream) filestream.destroy();
    if(rl) rl.close();
  }
}