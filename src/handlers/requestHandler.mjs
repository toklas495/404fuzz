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
        // Professional fuzzer error handling:
        // - Network errors are EXPECTED during fuzzing (timeouts, connection refused, etc.)
        // - Don't throw CliError for network issues - let fuzzEngine handle silently
        // - Only throw for truly fatal errors
        
        // If it's already a CliError, re-throw it (might be validation error)
        if (error instanceof CliError) {
            // Only re-throw validation errors - these are fatal
            if (error.category === 'validation') {
                throw error;
            }
            // For other CliErrors, just throw as-is (fuzzEngine will handle)
            throw error;
        }
        
        // Handle network/system errors - these are EXPECTED in fuzzing
        // Wrap them but don't make them fatal - fuzzEngine will handle silently
        const code = error.code;
        
        // Create a network error that fuzzEngine can handle silently
        const networkError = new CliError({
            isKnown: true,
            message: error.message || "Request failed",
            code: code,
            category: code === "ETIMEDOUT" ? "timeout" : 
                     code === "ENOTFOUND" ? "dns" : 
                     (code && (code.includes("ECONN") || code.includes("EHOST") || code.includes("ENET"))) ? "network" : "http",
            originalError: error,
            url: path
        });
        
        // Throw the error - fuzzEngine will catch and handle silently
        throw networkError;
    }
}