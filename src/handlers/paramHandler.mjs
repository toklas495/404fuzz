import {URL as URLBUILDER} from 'url';
import CliError from '../utils/Error.mjs';

export default function paramHandler({url,header,method,data}){
    let urlparams = null;
    if(!url){   
        throw new CliError({
            isKnown:true,
            message:"url is required!",
            type:"warn",
            category:"validation"  
        })
    }
    try{
        // parse variable
        if(!/^https?:\/\//i.test(url)){
            url = `http://${url}`;
        }

        // security: validate URL format
        try{
            urlparams = new URLBUILDER(url);
        }catch(urlError){
            throw new CliError({
                isKnown:true,
                message:`Invalid URL format: ${url}`,
                code:urlError.code ||"ERR_INVALID_URL",
                category:"validation",
                url:url
            });
        }
        const protocol = urlparams.protocol.slice(0,-1).toLowerCase();
        if(protocol!=="https"&&protocol!=="http"){
            throw new CliError({
                isKnown:true,
                message:`Unsupported protocol: ${protocol}. Only http or https are supported!`,
                category:"validation",
                url:url
            })
        }

        let headers = undefined;
        if(header instanceof Array&&header.length){
            headers = {};
            header.forEach(h=>{
                if(!h.includes(":")){
                    throw new CliError({
                        isKnown:true,
                        message:`Invalid header format: "${h}". Must be "key: value"`,
                        type:"warn",
                        category:"validation",
                        details:{header:h}
                    })

                }
                const [key,value] = h.split(":").map(s=>s.trim());
                if(!key||!value){
                    throw new CliError({
                        isKnown:true,
                        message:`Invalid header: "${h}". key and value cannot be empty.`,
                        type:"warn",
                        category:"validation",
                        details:{header:h,key,value}
                    })
                }
               headers[key] = value; 
            })  
        }
        const upperMethod = method.toUpperCase();
        // body
        let body = undefined;
        if(data){
            body = data;
        }

        return {
            hostname:urlparams.hostname,
            ...(urlparams.port!==undefined&&{port:Number(urlparams.port)}),
            path:urlparams.pathname+urlparams.search,//include queryparams;
            method:upperMethod,
            ...(headers!==undefined&&{headers}),
            ...(body!==undefined&&{body}),
            protocol
        }   

    }catch(error){
        if(error instanceof CliError){
            throw error;
        }

        if(error.code==="ERR_INVALID_URL"){
            throw new CliError({
                isKnown:true,
                message:`Invalid Url Format: ${url}`,
                code:code,
                category:"validation",
                url
            })
        }

        throw new CliError({
            isKnown:false,
            message:error.message || `param validation failed!`,
            originalError:error,
            url:url
        })
    }  
}