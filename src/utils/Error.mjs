/**
 * Comprehensive Error class for 404fuzz
 * Supports error codes, categories, and detailed context
 */

class CliError extends Error{
    constructor({
        isKnown=false,
        message,
        type="error",
        code=null,
        category="general",
        detail=null,
        originalError=null,
        statusCode=null,
        url=null
    }={}){
        super(message);
        this.name = "CliError";
        this.isKnown = isKnown;
        this.type = type;
        this.code = code;
        this.message = message;
        this.category = category;
        this.detail = detail,
        this.originalError = originalError;
        this.url = url;
        this.statusCode = statusCode;

        if(Error.captureStackTrace){
            Error.captureStackTrace(this,this.constructor);
        }
    }
}


export default CliError;
