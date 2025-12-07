export default function replaceParamsWithFuzz(args, fuzz_in_request, fuzz_word) {

  // ✅ SAFE CLONE (NO SHARED REFERENCES)
  const replaceArgs = {
    path: args.path,
    headers: args.headers
      ? {...args.headers}   // ✅ deep copy
      : undefined,
    body: args.body
  };

  // ---- PATH ----
  if (fuzz_in_request?.path?.isFuzz && typeof replaceArgs.path === "string") {
    replaceArgs.path = replaceArgs.path.split("FUZZ").join(fuzz_word);
  }

  // ---- HEADERS ----
  if (
    fuzz_in_request?.headers?.isFuzz &&
    replaceArgs.headers &&
    typeof replaceArgs.headers === "object"
  ) {
    let headers = replaceArgs.headers;

    // ✅ Replace in HEADER VALUES
    for (let key of fuzz_in_request.headers.keys || []) {
      if (headers[key]&&typeof headers[key]==="string") {
        headers[key] = headers[key].replaceAll("FUZZ", fuzz_word);
      }
    }

    // ✅ Replace in HEADER KEYS
    if (fuzz_in_request.headers.isKey) {
      let newHeaders = {};
      for (let [key, value] of Object.entries(headers)) {
        const newKey = key.includes("FUZZ")
          ? key.replaceAll("FUZZ", fuzz_word)
          : key;

        newHeaders[newKey] = value;
      }
      headers = newHeaders;
    }

    replaceArgs.headers = headers;
  }

  // ---- BODY ----
  if (fuzz_in_request?.body?.isFuzz && replaceArgs.body !== undefined) {

    if (fuzz_in_request.body.type === "string") {
      replaceArgs.body = replaceArgs.body.split("FUZZ").join(fuzz_word);
    } 
    else {
      // ✅ object mode → stringify → replace
      replaceArgs.body = JSON.stringify(replaceArgs.body)
        .replaceAll("FUZZ", fuzz_word);
    }
  }

  return replaceArgs;
}
