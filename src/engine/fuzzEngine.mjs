import RequestHandler from '../handlers/requestHandler.mjs';
import replaceParamWithFuzz from '../utils/replaceParamWithFuzz.mjs';
import FuzzQueue from '../utils/fuzzQueue.mjs';
import { markError,markSuccess } from '../utils/liveRps.mjs';

class FuzzEngine{
    constructor({
        concurrency=500,
        delay=0,
        matchStatus=[],
        filterStatus=[],
        requestModule
    }){
        this.queue = new FuzzQueue(concurrency);
        this.delay = delay;
        this.matchStatus = matchStatus;
        this.filterStatus = filterStatus;
        this.requestModule = requestModule;
        this.printCounter = 0;
    }

    async fuzz({baseRequest,fuzz_in_request,fuzzlist}){
        let results = [];
        for await(let fuzz of fuzzlist){
            await this.queue.add(async()=>{
                const replaced_words = replaceParamWithFuzz({
                    path:baseRequest.path,
                    headers:baseRequest.headers,
                    body:baseRequest.body
                },fuzz_in_request,fuzz)
                // RequestHandler
                try{
                    const res = await RequestHandler({
                        hostname:baseRequest.hostname,
                        port:baseRequest.port,
                        path:replaced_words.path,
                        method:baseRequest.method,
                        headers:replaced_words.headers,
                        body:replaced_words.body,
                        protocol:baseRequest.protocol
                    },this.requestModule)

                    markSuccess();
                    if(this.delay>0){
                        await new Promise(r=>setTimeout(r,this.delay));
                    }
                

                    if(this.filterStatus.length&&this.filterStatus.includes(res.meta.status)) return;
                    if(this.matchStatus.length&&!this.matchStatus.includes(res.meta.status)) return;

                    // results.push({
                    //     fuzz,
                    //     status:res.meta.status,
                    //     size:res.response.size.totalBytes,
                    //     time:res.meta.durationMs,
                    // })

                    // Format output similar to ffuf - clean and professional
                    const status = res.meta.status;
                    const size = res.response.size.totalBytes;
                    const duration = res.duration;
                    
                    // Color code status for better visibility
                    let statusColor = '';
                    if (status >= 200 && status < 300) {
                        statusColor = '\x1b[32m'; // green for success
                    } else if (status >= 300 && status < 400) {
                        statusColor = '\x1b[33m'; // yellow for redirects
                    } else if (status >= 400 && status < 500) {
                        statusColor = '\x1b[31m'; // red for client errors
                    } else if (status >= 500) {
                        statusColor = '\x1b[35m'; // magenta for server errors
                    }
                    const reset = '\x1b[0m';
                    
                    // Format: [Status]  fuzz_word  [Size]  [Time]
                    // Similar to ffuf but cleaner and more professional
                    const fuzzDisplay = fuzz.length > 45 ? fuzz.substring(0, 42) + '...' : fuzz;
                    // Output will appear below dashboard (dashboard handles cursor positioning)
                    process.stdout.write(
                        `${statusColor}[${status}]${reset}  ${fuzzDisplay.padEnd(45)}  [Size: ${size}]  [Time: ${duration}]\n`
                    );
                }catch(err){
                    markError();
                    // Don't print errors here - they're handled in build.mjs
                };
            })
        }

        await this.queue.drain();
        return results;
    }
}

export default FuzzEngine;