#! /usr/bin/env node

import yargs from "yargs";
import {hideBin} from 'yargs/helpers';
import cmdargs from "./src/cmdArguments/index.mjs";
import builder from "./src/build.mjs";

yargs(hideBin(process.argv))
    .scriptName("404fuzz")
    .usage("$0 <cmd> [args]")
    .command(
        "$0",
        "Show Ascii Banner",
        ()=>{},
        ()=>{
            import("./src/utils/banner.mjs").then(m=>m.default());
        }
    )// fuzz with fuzz command
    .command(
        "fuzz <url>",
        "Fuzz Http Request",
        cmdargs.fuzz,
        async(argv)=>{
            await builder.requestHander(argv);
        }
    )
    .help()
    .parse();