import CliError from "../utils/Error.mjs";

const fuzzArgs = (yargs)=>{
    return yargs
    .usage("Usage: 404fuzz <url> [options]")
    .positional("url",{
        type:"string",
        descrble:"The API endpoint URL you want to request.",
        demandOption:true,
    })
    .option("method",{
        alias:"X",
        type:"string",
        default:"GET",
        describe:"HTTP method to use. Allowed: GET,PUT,POST,DELETE. Default:GET"
    })
    .option("data",{
        alias:"d",
        type:"string",
        describe:"REQUEST body in json format (use with POST and PUT). Example: '{\"key\":\"value\"}'"
    })
    .option("header",{
        alias:"H",
        type:"array",
        describe:"Custom headers. Use Multiple -H options or an array, Format: 'key:value'. Example: -H \"Authorization: Bearer token\"",
    })
    .option("wordlist",{
        type:"string",
        describe:"Wordlist file path and (optional) keyword separated by colon. eg. '/path/to/wordlist:KEYWORD",
        alias:"w"
    })
    .option("timeout",{
        type:"number",
        describe:"how long to wait for the server to send data after connection is established... For example 1000ms,10000ms"
    })
    .option("insecure",{
        alias:"k",
        type:"boolean",
        describe:"Allow insecure SSL connections (bypass certificate verification). Not recommended for production use"
    })
    .option("delay",{
        type:"number",
        describe:"Seconds of `delay` between requests, or a range of random delay. For example 0.1 or 2"
    })
    .option("concurrent",{
        alias:"t",
        type:"number",
        describe:"Number of concurrent request"
    })
    .option("match_status",{
        alias:"m",
        type:"string",
        describe:"Match HTTP status codes, or all for everything. (default: 301,302,307,401,403,405,500)",
        coerce:(val)=>val==="all"?[]:val.split(",").map(n=>Number(n.trim()))
    })
    .option("filter_status",{
        alias:"f",
        type:"string",
        describe:"Filter HTTP status codes from response. Comma separated list of codes",
        coerce:(val)=>val==="all"?[]:val.split(",").map(n=>Number(n.trim()))
    })
    .example(
        "404fuzz https://api.example.com/user -X POST -d '{\"email\":\"value\"}'"
    )
    .check((argv)=>{
        // validate header
        if(argv.header){
            argv.header.forEach((h)=>{
                if(!h.includes(":")){
                    throw new CliError({isKnown:true,type:"warn",message:`Invalid header format: ${h}. Must be "key:value"`})
                }
                const [key,value] = h.split(":").map((s)=>s.trim());
                if(!key||!value){
                    throw new CliError({isKnown:true,type:"warn",message:`Invalid header: ${h}. key and value cannot be empty.`})
                }
            })
        }

        if(argv.delay){
            const delay = parseInt(argv.delay);
            if(!delay) throw new CliError({isKnown:true,type:"warn",message:`Invalid delay: ${argv.delay}. must be in number`})
        }

        if(argv.concurrent){
            const concurrent = parseInt(argv.concurrent);
            if(!concurrent) throw new CliError({isKnown:true,type:'warn',message:`Invalid concurrent!`});
        }

        return true;
    })
}

export default fuzzArgs;