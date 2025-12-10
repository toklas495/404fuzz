import cluster from 'cluster';
import os from 'os';
import fuzzHander from '../handlers/fuzzHandler.mjs';
import { setUpClusterRps } from '../utils/clusterRps.mjs';
import { initDashboard, cleanupDashboard } from '../utils/fixedDashboard.mjs';
import CliError from '../utils/Error.mjs';
import theme from '../utils/theme.mjs';
import fs from 'fs';
import banner from '../utils/banner.mjs';
import { startRpsFlush, stopRpsFlush,calculateCores } from '../utils/liveRps.mjs';
import {outputStream,outputWrite,payloadCount} from '../handlers/fileHandler.mjs';
import { validateFuzzPlaceholder } from '../utils/findFuzz.mjs';


let masterOutputStream = null; 
// Track if cluster listeners are already set up (prevent duplicates)
let clusterListenersSetup = false;


async function clusterEngine(argv){
    if(cluster.isPrimary){
        // Set max listeners to prevent warnings (we use multiple workers)
        cluster.setMaxListeners(0); // 0 = unlimited
        
        // Show banner first - professional touch (skip if JSON output for clean output)
        if (!argv.json) {
            banner();
            process.stdout.write('\n');
        }

        if(argv.output){
            masterOutputStream = outputStream(argv.output);
        }
        
        // EARLY VALIDATION: Check if FUZZ placeholder exists
        // This prevents wasting time if no FUZZ parameter is found
        const hasFuzz = validateFuzzPlaceholder(argv.url, argv.data, argv.header);
        if (!hasFuzz) {
            throw new CliError({
                isKnown: true,
                message: 'No FUZZ placeholder found in URL, headers, or request body. Please add FUZZ where you want to fuzz.',
                category: 'validation',
                detail: {
                    suggestion: 'Example: https://example.com/FUZZ or -H "Authorization: Bearer FUZZ" or -d \'{"key":"FUZZ"}\''
                }
            });
        }
        
        // Validate wordlist before starting workers
        if(!argv.wordlist){
            throw new CliError({
                isKnown: true,
                message: 'Wordlist is required. Use --wordlist or -w to specify a wordlist file.',
                category: 'validation'
            });
        }

        // Check if wordlist file exists and is readable
        try {
            await fs.promises.access(argv.wordlist, fs.constants.R_OK);
        } catch (error) {
            throw new CliError({
                isKnown: true,
                message: `Wordlist file not found or not readable: ${argv.wordlist}`,
                category: 'validation',
                code: 'ENOENT',
                url: argv.wordlist
            });
        }

        // Calculate cores to use
        const maxCores = os.cpus().length;
        const coresOption = argv.cores || 'half';
        const cores = calculateCores(coresOption, maxCores);
        const workers = [];
        let isShuttingDown = false;
        let finishedWorkers = 0;

        // Setup signal handlers for graceful shutdown
        const shutdown = async (signal) => {
            if (isShuttingDown) return; // Prevent multiple shutdowns
            isShuttingDown = true;
            
            // Only cleanup dashboard if it was initialized (not in JSON mode)
            if (!argv.json) {
                cleanupDashboard();
            } else {
                // Just restore cursor for JSON mode
                process.stdout.write("\x1b[?25h");
            }
            process.stdout.write(`\n${theme.warn('Received ' + signal + '. Shutting down gracefully...')}\n`);
            
            // Kill all workers
            for (const id in cluster.workers) {
                cluster.workers[id].kill('SIGTERM');
            }
            
            // Wait a bit for workers to finish
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Force kill if still running
            for (const id in cluster.workers) {
                if (!cluster.workers[id].isDead()) {
                    cluster.workers[id].kill('SIGKILL');
                }
            }
            
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

        // Display core information
        const coresInfo = coresOption === 'half' ? 'half' : 
                         coresOption === 'all' ? 'all' : 
                         coresOption === 'single' ? 'single' : 
                         `${coresOption} (capped at ${cores})`;
        
        process.stdout.write(`${theme.info(`Using ${cores}/${maxCores} CPU cores (${coresInfo})`)}\n`);
        
        // Count wordlist lines for progress tracking (fast async counting)
        let wordlistCount = await payloadCount(argv.wordlist);

        process.stdout.write(`${theme.info(`Wordlist: ${wordlistCount} words | Starting ${cores} workers...`)}\n\n`);
        
        // Initialize dashboard after banner (skip if JSON output is enabled)
        // JSON output should be clean and machine-readable, no dashboard
        if (!argv.json) {
            initDashboard(wordlistCount || 100000);
            // Setup cluster RPS tracking (only once)
            setUpClusterRps(cluster);
        }

        // Setup cluster-level event listeners (only once)
        if (!clusterListenersSetup) {
            cluster.on("message",async(worker,msg)=>{
                if(msg?.type==="OUTPUT_RESULT"){
                    await outputWrite(masterOutputStream,msg?.data);
                }
            })
            // Handle worker exit - single listener for all workers
            cluster.on("exit", (worker, code, signal) => {
                finishedWorkers++;
                
                if (code !== 0 && signal !== 'SIGTERM' && !isShuttingDown) {
                    process.stdout.write(`${theme.error(`Worker ${worker.process.pid} died with code ${code}`)}\n`);
                }
                
                // If all workers finished, cleanup and exit
                if (finishedWorkers === cores && !isShuttingDown) {
                    // Only cleanup dashboard if it was initialized (not in JSON mode)
                    if (!argv.json) {
                        cleanupDashboard();
                    } else {
                        // Just restore cursor for JSON mode
                        process.stdout.write("\x1b[?25h");
                    }
                    process.exit(0);
                }
            });
            
            clusterListenersSetup = true;
        }

        // Fork workers
        for(let i=0;i<cores;i++){
            const worker = cluster.fork({
                WORKER_ID:i,
                WORKER_COUNT:cores
            });
            workers.push(worker);
        }

    }else{
        // worker process runs a real fuzzing
        const workerId = Number(process.env.WORKER_ID);
        const workerCount = Number(process.env.WORKER_COUNT);

        argv.__workerId = workerId;
        argv.__workerCount = workerCount;

        // start sending rps stat to master
        startRpsFlush();

        // Handle worker shutdown
        process.on('SIGTERM', () => {
            //  attempt gracefully stop
            try{stopRpsFlush();}catch{}
            process.exit(0);
        });

        try {
            await fuzzHander(argv);
            // ensure flush stopped before exit
            stopRpsFlush();
            process.exit(0);
        } catch (error) {
            try{stopRpsFlush()}catch{}
            if (error instanceof CliError && error.isKnown) {
                process.stderr.write(`${theme.error(error.message)}\n`);
            } else {
                process.stderr.write(`${theme.error('Worker error: ' + (error.message || 'Unknown error'))}\n`);
            }
            process.exit(1);
        }
    }
}

export default clusterEngine;