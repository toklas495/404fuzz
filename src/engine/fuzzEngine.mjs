import RequestHandler from '../handlers/requestHandler.mjs';
import replaceParamWithFuzz from '../utils/replaceParamWithFuzz.mjs';
import FuzzQueue from '../utils/fuzzQueue.mjs';
import { markError, markSuccess } from '../utils/liveRps.mjs';
import CliError from '../utils/Error.mjs';

class FuzzEngine {
    constructor({
        concurrency = 5,
        delay = 0,
        matchStatus = [],
        filterStatus = [],
        requestModule,
        jsonOutput = false,
        outputFile = null
    }) {
        this.queue = new FuzzQueue(concurrency);
        this.delay = delay;
        this.matchStatus = matchStatus;
        this.filterStatus = filterStatus;
        this.requestModule = requestModule;
        this.printCounter = 0;
        this.jsonOutput = jsonOutput;
        this.outputFile = outputFile;

        this.fuzz = this.fuzz.bind(this);
    }

    async fuzz({ baseRequest, fuzz_in_request, fuzzlist }) {
        let results = [];
        try {
            for await (let fuzz of fuzzlist) {
                this.queue.add(async () => {
                    const replaced_words = replaceParamWithFuzz({
                        path: baseRequest.path,
                        headers: baseRequest.headers,
                        body: baseRequest.body
                    }, fuzz_in_request, fuzz)
                    // RequestHandler
                    try {
                        const res = await RequestHandler({
                            hostname: baseRequest.hostname,
                            port: baseRequest.port,
                            path: replaced_words.path,
                            method: baseRequest.method,
                            headers: replaced_words.headers,
                            body: replaced_words.body,
                            protocol: baseRequest.protocol
                        }, this.requestModule)

                        markSuccess();
                        if (this.delay > 0) {
                            await new Promise(r => setTimeout(r, this.delay));
                        }


                        if (this.filterStatus.length && this.filterStatus.includes(res.meta.status)) return;
                        if (this.matchStatus.length && !this.matchStatus.includes(res.meta.status)) return;

                        // Format output similar to ffuf - clean and professional
                        const status = res.meta.status;
                        const size = res.response.size.totalBytes;
                        const duration = res.duration;

                        // JSON output format (JSONL - one JSON object per line)
                        if (this.jsonOutput) {
                            // Build full URL with replaced path
                            const port = baseRequest.port && baseRequest.port !== 80 && baseRequest.port !== 443
                                ? `:${baseRequest.port}`
                                : '';
                            const fullUrl = `${baseRequest.protocol}://${baseRequest.hostname}${port}${replaced_words.path}`;

                            // Calculate words and lines from response body
                            const body = res.response.body || '';
                            const isText = /^[\x09\x0A\x0D\x20-\x7E]*$/.test(body);
                            const words = isText && body.trim() ? body.trim().split(/\s+/).length : 0;
                            const lines = isText ? body.split('\n').length : 0;

                            // JSON output format (similar to ffuf)
                            const jsonResult = {
                                url: fullUrl,
                                status: status,
                                size: size,
                                words: words,
                                lines: lines,
                                timeMs: res.meta.durationMs, // Duration in milliseconds
                                fuzz: fuzz
                            };

                            // JSONL format: one JSON object per line (compact, not pretty-printed)
                            const output = JSON.stringify(jsonResult) + '\n';

                            // Write to file stream if specified, otherwise stdout
                            if (this.outputFile && process.send) {
                                process.send({ type: "OUTPUT_RESULT", data: output });
                            } else {
                                process.stdout.write(output);
                            }
                        } else {
                            // Normal colored output format
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
                            const output = `${statusColor}[${status}]${reset}  ${fuzzDisplay.padEnd(45)}  [Size: ${size}]  [Time: ${duration}]\n`;

                            // Write to file stream if specified, otherwise stdout
                            if (this.outputStream) {
                                // For file output, remove ANSI color codes for clean text
                                const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
                                this.outputStream.write(cleanOutput);
                            } else {
                                process.stderr.write(output);
                            }
                        }

                    } catch (err) {
                        // Professional fuzzer error handling:
                        // - Network errors (timeouts, connection refused, etc.) are EXPECTED during fuzzing
                        // - Swallow network errors silently - just mark and continue
                        // - Only fatal errors (validation, programming bugs) should stop fuzzing

                        markError(); // Track error in statistics

                        // Check if this is a fatal error that should stop fuzzing
                        if (err instanceof CliError) {
                            // Fatal errors: validation, configuration issues - these should stop
                            if (err.category === 'validation') {
                                throw err; // Re-throw fatal validation errors
                            }
                            // Network/timeout/dns/http errors are EXPECTED - swallow silently
                            // These happen all the time during fuzzing, just continue
                            return; // Continue to next fuzz word silently
                        } else {
                            // Non-CliError - might be a programming error, re-throw to stop
                            throw err;
                        }
                    };
                })
            }

            await this.queue.drain();
        } finally {
            // Close output stream if it was opened
            if (this.outputStream) {
                await new Promise((resolve, reject) => {
                    this.outputStream.end(() => {
                        resolve();
                    });
                    this.outputStream.on('error', reject);
                });
            }
        }

        return results;
    }
}

export default FuzzEngine;