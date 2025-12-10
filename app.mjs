#! /usr/bin/env node

import yargs from "yargs";
import {hideBin} from 'yargs/helpers';
import cmdargs from "./src/cmdArguments/index.mjs";
import builder from "./src/build.mjs";
import CliError from "./src/utils/Error.mjs";
import theme from "./src/utils/theme.mjs";
import cluster from 'cluster';

// important prevent worker from running cli

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    if (error instanceof CliError && error.isKnown) {
        process.stderr.write(`${theme.error('Error: ' + error.message)}\n`);
        if (error.detail && error.detail.suggestion) {
            process.stderr.write(`${theme.info('Suggestion: ' + error.detail.suggestion)}\n`);
        }
    } else {
        process.stderr.write(`${theme.error('Unexpected error: ' + (error.message || 'Unknown error'))}\n`);
        if (process.env.DEBUG) {
            console.error(error);
        }
    }
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    if (reason instanceof CliError && reason.isKnown) {
        process.stderr.write(`${theme.error('Error: ' + reason.message)}\n`);
        if (reason.detail && reason.detail.suggestion) {
            process.stderr.write(`${theme.info('Suggestion: ' + reason.detail.suggestion)}\n`);
        }
    } else {
        process.stderr.write(`${theme.error('Unhandled rejection: ' + (reason?.message || String(reason)))}\n`);
        if (process.env.DEBUG) {
            console.error(reason);
        }
    }
    process.exit(1);
});


yargs(hideBin(process.argv))
    .scriptName("404fuzz")
    .usage("Usage: 404fuzz <url> [options]")
    .command(
        "* [url]",
        false,
        cmdargs.fuzz,
        async(argv)=>{
            try {
                await builder.fuzz(argv);
            } catch (error) {
                if (error instanceof CliError) {
                    if (error.isKnown) {
                        if (error.type === 'warn') {
                            process.stderr.write(`${theme.warn('Warning: ' + error.message)}\n`);
                        } else {
                            process.stderr.write(`${theme.error('Error: ' + error.message)}\n`);
                        }
                        if (error.detail && error.detail.suggestion) {
                            process.stderr.write(`${theme.info('Suggestion: ' + error.detail.suggestion)}\n`);
                        }
                    } else {
                        process.stderr.write(`${theme.error('Error: ' + error.message)}\n`);
                        if (process.env.DEBUG) {
                            console.error(error);
                        }
                    }
                } else {
                    process.stderr.write(`${theme.error('Error: ' + (error.message || 'Unknown error'))}\n`);
                    if (process.env.DEBUG) {
                        console.error(error);
                    }
                }
                process.exit(1);
            }
        }
    )
    .help()
    .fail((msg, err, yargs) => {
        if (err instanceof CliError) {
            if (err.isKnown) {
                process.stderr.write(`${theme.error('Error: ' + err.message)}\n`);
                if (err.detail && err.detail.suggestion) {
                    process.stderr.write(`${theme.info('Suggestion: ' + err.detail.suggestion)}\n`);
                }
            } else {
                process.stderr.write(`${theme.error('Error: ' + err.message)}\n`);
            }
        } else {
            process.stderr.write(`${theme.error(msg || 'Invalid arguments')}\n`);
            if (err) {
                process.stderr.write(`${theme.error(err.message)}\n`);
            }
            process.stderr.write(`\n${yargs.help()}\n`);
        }
        process.exit(1);
    })
    .parse();