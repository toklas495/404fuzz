import Request from "./engine/requestEngine.mjs";
import paramHandler from "./handlers/paramHandler.mjs";
import https from 'https';
import http from 'http';
import {streamWordlist} from './handlers/fileHandler.mjs';
import FindFuzz from "./utils/findFuzz.mjs";
import FuzzEngine from "./engine/fuzzEngine.mjs";

const builder = {
    async requestHander(argv){
        const {method,url,header,data,insecure,timeout,wordlist,delay,concurrent,match_status,filter_status} = argv;
        try{
            // param handler
            const {hostname,
                   port:req_port,
                   path:req_path,
                   method:req_method,
                   headers:req_headers,
                   body:req_body,
                   protocol:req_protocol
            } = paramHandler({url,header,method,data});
            // request module setup

            // find fuzz in request
            const fuzz_in_request = FindFuzz({
                path:req_path,
                headers:req_headers,
                body:req_body
            })
            // replace request params with fuzz
            //-------------------------------------------------------------
            const requestModule = new Request();
            const httpModule = req_protocol==="https"?https:http;
            requestModule.addModule(httpModule);
            if(insecure) requestModule.setInsecure(insecure);
            if(timeout) requestModule.addTimeout(timeout);
            //--------------------------------------------------------------
            const fuzzEngine = new FuzzEngine({
                requestModule:requestModule,
                ...(delay!==undefined&&{delay:parseInt(delay)*1000}),
                ...(concurrent!==undefined&&{concurrency:concurrent}),
                ...(match_status!==undefined&&{matchStatus:match_status}),
                ...(filter_status!==undefined&&{filterStatus:filter_status})
            })

            await fuzzEngine.fuzz({baseRequest:{
                hostname,
                port:req_port,
                method:req_method,
                headers:req_headers,
                body:req_body,
                path:req_path,
                protocol:req_protocol
            },fuzz_in_request,fuzzlist:streamWordlist(wordlist)});
        }catch(error){
            console.error(error);
        }
    }
}

export default builder;