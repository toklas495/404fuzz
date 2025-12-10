import CliError from "../utils/Error.mjs";

const fuzzArgs = (yargs) => {
    return yargs
        .positional("url", {
            type: "string",
            descrble: "The API endpoint URL you want to request.",
            // demandOption: true,
        })
        .option("method", {
            alias: "X",
            type: "string",
            default: "GET",
            describe: "HTTP method to use. Allowed: GET,PUT,POST,DELETE. Default:GET"
        })
        .option("data", {
            alias: "d",
            type: "string",
            describe: "REQUEST body in json format (use with POST and PUT). Example: '{\"key\":\"value\"}'"
        })
        .option("header", {
            alias: "H",
            type: "array",
            describe: "Custom headers. Use Multiple -H options or an array, Format: 'key:value'. Example: -H \"Authorization: Bearer token\"",
        })
        .option("request",{
            type:"string",
            alias:"r",
            describe:"File containing the raw http request"
        })
        .option("wordlist", {
            type: "string",
            describe: "Wordlist file path and (optional) keyword separated by colon. eg. '/path/to/wordlist:KEYWORD",
            alias: "w",
            demandOption: true
        })
        .option("json", {
            type: "boolean",
            default: false,
            describe: "Output results in JSON format (one JSON object per line)"
        })
        .option("output", {
            alias: "o",
            type: "string",
            describe: "Save results to file. Use with --json for JSON output or without for text output"
        })
        .option("timeout", {
            type: "number",
            describe: "how long to wait for the server to send data after connection is established... For example 1000ms,10000ms"
        })
        .option("insecure", {
            alias: "k",
            type: "boolean",
            describe: "Allow insecure SSL connections (bypass certificate verification). Not recommended for production use"
        })
        .option("delay", {
            type: "number",
            describe: "Seconds of `delay` between requests, or a range of random delay. For example 0.1 or 2"
        })
        .option("concurrent", {
            alias: "t",
            type: "number",
            describe: "Number of concurrent request"
        })
        .option("match_status", {
            alias: "m",
            type: "string",
            describe: "Match HTTP status codes, or all for everything. (default: 301,302,307,401,403,405,500)",
            coerce: (val) => val === "all" ? [] : val.split(",").map(n => Number(n.trim()))
        })
        .option("filter_status", {
            alias: "f",
            type: "string",
            describe: "Filter HTTP status codes from response. Comma separated list of codes",
            coerce: (val) => val === "all" ? [] : val.split(",").map(n => Number(n.trim()))
        })
        .option("cores", {
            alias: "c",
            type: "string",
            default: "half",
            describe: "Number of CPU cores to use. Options: 'half', 'all', 'single', or a number (e.g., 2, 3, 4). Default: 'half'",
            coerce: (val) => {
                const lowerVal = String(val).toLowerCase().trim();
                if (lowerVal === 'half' || lowerVal === 'all' || lowerVal === 'single') {
                    return lowerVal;
                }
                const num = parseInt(lowerVal);
                if (isNaN(num) || num < 1) {
                    throw new CliError({
                        isKnown: true,
                        type: 'warn',
                        message: `Invalid cores value: ${val}. Must be 'half', 'all', 'single', or a positive number.`
                    });
                }
                return num;
            }
        })
        .example(
            "404fuzz fuzz https://api.example.com/user -X POST -d '{\"email\":\"value\"}'"
        )
        .example(
            "404fuzz fuzz https://api.example.com/FUZZ -w wordlist.txt -c 4"
        )
        .example(
            "404fuzz fuzz https://api.example.com/FUZZ -w wordlist.txt --cores half"
        )
        .check((argv) => {
            if(!argv.url && !argv.request){
                throw new CliError({
                    isKnown:true,
                    message:"Missing required input. Provide either a URL or --request <file>.",
                    type:"warn",
                    category:"validation"
                })
            }
            if (argv.header) {
                argv.header.forEach((h) => {
                    if (!h.includes(":")) {
                        throw new CliError({ isKnown: true, type: "warn", message: `Invalid header format: ${h}. Must be "key:value"` })
                    }
                    const [key, value] = h.split(":").map((s) => s.trim());
                    if (!key || !value) {
                        throw new CliError({ isKnown: true, type: "warn", message: `Invalid header: ${h}. key and value cannot be empty.` })
                    }
                })
            }

            if (argv.delay) {
                const delay = parseInt(argv.delay);
                if (!delay) throw new CliError({ isKnown: true, type: "warn", message: `Invalid delay: ${argv.delay}. must be in number` })
            }

            if (argv.concurrent) {
                const concurrent = parseInt(argv.concurrent);
                if (!concurrent) throw new CliError({ isKnown: true, type: 'warn', message: `Invalid concurrent!` });
            }

            // Validate cores option
            if (argv.cores) {
                const cores = argv.cores;
                if (typeof cores === 'string') {
                    const validOptions = ['half', 'all', 'single'];
                    if (!validOptions.includes(cores.toLowerCase())) {
                        throw new CliError({
                            isKnown: true,
                            type: 'warn',
                            message: `Invalid cores option: ${cores}. Must be 'half', 'all', or 'single'.`
                        });
                    }
                } else if (typeof cores === 'number') {
                    if (cores < 1) {
                        throw new CliError({
                            isKnown: true,
                            type: 'warn',
                            message: `Invalid cores number: ${cores}. Must be a positive number.`
                        });
                    }
                }
            }

            return true;
        })
}

export default fuzzArgs;