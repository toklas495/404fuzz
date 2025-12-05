import CliError from "../utils/Error.mjs";

class Request{
    constructor(){
        this.options = {};
        this.payload = null;
        this.timeout = 0; //default 
        this.insecure = false;
        this.parsedJson = false;
        this.maxBodySize = 1024*1024;// 1 mb
    }

    addModule(httpModule,options={}){
        this.http = httpModule;
        this.agent = new this.http.Agent({
            keepAlive:true,
            maxSockets:1000,
            maxFreeSockets:256,
            timeout:60000,  //idle socket timeout
            keepAliveMsecs:5000 // send tcp keep alive every 5 second
        })
        this.options.agent = this.agent;
        this.options["rejectUnauthorized"] = options.rejectUnauthorized!==false //default to true for security
        this.insecure = options.insecure||false;
        return this;
    }

    enableJsonParsing(){
        this.parsedJson = true;
        return this;
    }

    setMaxBodySize(body_size){
        this.maxBodySize = body_size;
        return this;
    }

    addHost(hostname){
        this.options["hostname"] = hostname;
        return this;
    }

    addMethod(method){
        this.options["method"] = method.toUpperCase();
        return this;
    }

    addPort(post){
        this.options["port"] = post;
        return this;
    }

    setInsecure(insecure=false){
        this.insecure = insecure;
        this.options["rejectUnauthorized"] = !insecure;
        return this;
    }

    addCert(){
        this.options["rejectUnauthorized"] = true;
        this.insecure = false;
        return this;
    }

    addPath(path){
        this.options["path"] = path;
        return this;
    }

    addHeaders(headers={}){
        this.options["headers"] = headers;
        return this;
    }

    addBody(body={}){
        this.payload = body;
        this.options.headers = this.options?.headers||{};
        if(!this.options.headers.hasOwnProperty("Content-Length")) this.options.headers["Content-Length"] = Buffer.byteLength(this.payload);
        return this;
    }

    addTimeout(timeout){
        this.timeout = timeout;
        return this;
    }


    async send(){
        return new Promise((resolve,reject)=>{
            const start = performance.now();
            const timeoutMs = this.timeout;
            const req = this.http.request(this.options,(res)=>{
                let data = [];
                let total_size = 0;
                res.on("data",(chunk)=>{
                    total_size+=chunk.length;
                    if(total_size<=this.maxBodySize) data.push(chunk);
                    else res.destroy();
                    // stop receiving more data to prevent memory explosion
                })

                res.on("end",()=>{
                    clearTimeout(timeoutTimer);
                    const end = performance.now();
                    const ms = end-start;
                    const duration = ms<1000?`${ms.toFixed(2)}ms`:`${(ms/1000).toFixed(2)}s`
                    const raw = Buffer.concat(data);
                    const body = raw.toString();
                    // try to parse json automatically
                    let parsedJson = null;
                    if(parsedJson){
                        try{
                            parsedJson = JSON.parse(body);
                        }catch{};
                    }

                    resolve({
                        meta:{
                            status:res.statusCode,
                            message:res.statusMessage,
                            httpVersion:res.httpVersion,
                            durationMs:ms,
                            timestamp:Date.now()
                        },
                        response:{
                            headers:res.headers,
                            rawHeaders:res.rawHeaders,
                            body,
                            json:parsedJson||null,
                            size:{
                                bodyBytes:raw.length,
                                headersBytes:res.rawHeaders.reduce((a,h)=>a+Buffer.byteLength(h),0),
                                totalBytes:raw.length+res.rawHeaders.reduce((a,h)=>a+Buffer.byteLength(h),0)
                            }
                        },
                        duration,
                        timing:{
                            startTime:start,
                            endTime:end,
                            totalMs:ms
                        },
                        // request info
                        request:{
                            method:this.options.method,
                            url:this.options.path,
                            headers:this.options.headers,
                            payload:this.payload,
                            host:this.options.hostname
                        }
                    })
                })
            })

            // Timeout handling important 
            let timeoutTimer = null;
            if(timeoutMs>0){
                timeoutTimer = setTimeout(()=>{
                    req.destroy()// abort socket;
                    reject(new CliError({isKnown:true,message:`Request Timeout after ${timeoutMs}`}))
                },timeoutMs)
            }

            // on error
            req.on("error",(err)=>{
                clearTimeout(timeoutTimer);
                // handles ssl tls error speciafically
                if(err.code&&(err.code.includes("CERT")||err.code.includes("SSL")||
                    err.code.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE") ||
                    err.code.includes("SELF_SIGNED_CERT_IN_CHAIN")||
                    err.code.includes("DEPTH_ZERO_SELF_SIGNED_CERT")
                )){
                    reject(new CliError({
                        isKnown:true,
                        message:`SSL certification verification failed: ${err.message}`,
                        code:err.code,
                        category:"ssl",
                        originalError:err,
                        detail:{
                            suggestion:"use --insecure flag to bypass certification verification (not recommended)"
                        }
                    }))
                    return;
                }
                reject(err);
            });
            if(this.payload) req.write(this.payload);
            req.end();
        })
    }
}

export default Request;