export default function FindFuzz({ path, headers, body }) {
    const fuzz_in_request = {
        path: { type: "string", isFuzz: false },
        headers: {
            type: "object",
            isFuzz: false,
            isKey: false,
            keys: []
        },
        body: { type: "object", isFuzz: false},
    };

    // -------- Path --------
    if (typeof path === "string" && path.includes("FUZZ")) {
        fuzz_in_request.path.isFuzz = true;
    }

    // -------- Headers --------
    if (headers) {
        for (let [key, value] of Object.entries(headers)) {

            if (key.includes("FUZZ")) {
                fuzz_in_request.headers.isFuzz = true;
                fuzz_in_request.headers.isKey = true;
            }

            if (typeof value === "string" && value.includes("FUZZ")) {
                fuzz_in_request.headers.isFuzz = true;
                fuzz_in_request.headers.keys.push(key);
            }
        }
    }

    // -------- Body --------
    if (body) {

        if (typeof body === "string") {
            fuzz_in_request.body.type = "string";
            if (body.includes("FUZZ")) {
                fuzz_in_request.body.isFuzz = true;
            }
        }

        else if (typeof body === "object") {
            let stringBody = JSON.stringify(body).trim().includes("FUZZ");
            if(stringBody){
                fuzz_in_request.body.isFuzz = true;
            }
        }
    }

    return fuzz_in_request;
}


/**
 * Validate that FUZZ placeholder exists in the request
 * This prevents wasting time if no FUZZ parameter is found
 * @param {string} url - The URL to check
 * @param {string} data - Request body data
 * @param {Array|Object} headers - Request headers (array of "key:value" or object)
 * @returns {boolean} True if FUZZ found, false otherwise
 */

export function validateFuzzPlaceholder(url, data, headers) {
    // Check URL
    if (url && typeof url === 'string' && url.includes('FUZZ')) {
        return true;
    }
    
    // Check request body
    if (data) {
        if (typeof data === 'string' && data.includes('FUZZ')) {
            return true;
        }
        if (typeof data === 'object') {
            try {
                const dataStr = JSON.stringify(data);
                if (dataStr.includes('FUZZ')) {
                    return true;
                }
            } catch (e) {
                // If can't stringify, check as string
                if (String(data).includes('FUZZ')) {
                    return true;
                }
            }
        }
    }
    
    // Check headers - can be array of "key:value" strings or object
    if (headers) {
        if (Array.isArray(headers)) {
            // Array format: ["key:value", "key2:value2"]
            for (const header of headers) {
                if (typeof header === 'string' && header.includes('FUZZ')) {
                    return true;
                }
            }
        } else if (typeof headers === 'object') {
            // Object format: {key: "value", key2: "value2"}
            for (const [key, value] of Object.entries(headers)) {
                if ((typeof key === 'string' && key.includes('FUZZ')) ||
                    (typeof value === 'string' && value.includes('FUZZ'))) {
                    return true;
                }
            }
        }
    }
    
    return false;
}
