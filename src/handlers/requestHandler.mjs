import CliError from "../utils/Error.mjs";


export default async function RequestHandler(argv={},requestModule){
    const {method,headers,body,hostname,port,path,protocol} = argv;
    if(headers) requestModule.addHeaders(headers);
    // method
    const upperMethod = method.toUpperCase();
    requestModule.addMethod(upperMethod);
    // body
    if(body) requestModule.addBody(body);
    // url part
    requestModule.addHost(hostname);
    if(port&&port!==0) requestModule.addPort(Number(port));
    requestModule.addPath(path); // include queryparams
    // send request
    try{
        let response = await requestModule.send();
        return response;
    }catch(error){
    // If it's already a CliError, re-throw it
        if (error instanceof CliError) {
            throw error;
        }
        
        // Handle HTTP status errors (4xx, 5xx)
        if (error.response && error.response.meta) {
            const statusCode = error.response.meta.status;
            if (statusCode >= 400) {
                throw new CliError({
                    isKnown: true,
                    message: `HTTP Error ${statusCode}`,
                    category: "http",
                    statusCode: statusCode,
                    url:path,
                    details: {
                        statusText: error.response.meta.message,
                        body: error.response.response?.body
                    }
                });
            }
        }
        
        // Handle network/system errors
        const code = error.code;
        switch (code) {
            case "ENOTFOUND":
                throw new CliError({
                    isKnown: true,
                    message: "Could not resolve host",
                    code: code,
                    category: "dns",
                    url: path,
                    details: { hostname: hostname }
                });
            case "ERR_INVALID_URL":
                throw new CliError({
                    isKnown: true,
                    message: `Invalid URL format: "${path}"`,
                    code: code,
                    category: "validation",
                    url: path
                });
            case "ECONNREFUSED":
                throw new CliError({
                    isKnown: true,
                    message: "Connection refused",
                    code: code,
                    category: "network",
                    url: url,
                    details: {
                        hostname: hostname,
                        port: port || (protocol?.includes('https') ? 443 : 80)
                    }
                });
            case "ETIMEDOUT":
                throw new CliError({
                    isKnown: true,
                    message: "Connection timeout",
                    code: code,
                    category: "timeout",
                    url: url,
                    details: { timeout: timeout }
                });
            case "EHOSTUNREACH":
                throw new CliError({
                    isKnown: true,
                    message: "Host unreachable",
                    code: code,
                    category: "network",
                    url: url
                });
            case "ENETUNREACH":
                throw new CliError({
                    isKnown: true,
                    message: "Network unreachable",
                    code: code,
                    category: "network",
                    url: url
                });
            default:
                // For unknown errors, wrap them
                throw new CliError({
                    message: error.message || "Request failed",
                    code: code,
                    originalError: error,
                    url: path
                });
        }
    }
}