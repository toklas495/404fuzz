import RequestHandler from '../handlers/requestHandler.mjs';
import replaceParamWithFuzz from '../utils/replaceParamWithFuzz.mjs';
import FuzzQueue from '../utils/fuzzQueue.mjs';
import theme from '../utils/theme.mjs';

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

                    process.stdout.write(
                        `[${theme.warn(res.meta.status)}]  ${theme.info(fuzz)}   ${theme.success(res.response.size.totalBytes)}   ${res.duration}\n`
                    )
                }catch(err){};
            })
        }

        await this.queue.drain();
        return results;
    }
}

export default FuzzEngine;