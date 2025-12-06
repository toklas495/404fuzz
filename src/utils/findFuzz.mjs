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
