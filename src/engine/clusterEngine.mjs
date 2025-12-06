import cluster from 'cluster';
import os from 'os';
import builder from '../build.mjs';
import { setUpClusterRps } from '../utils/clusterRps.mjs';
import { initDashboard, cleanupDashboard } from '../utils/fixedDashboard.mjs';
import CliError from '../utils/Error.mjs';
import theme from '../utils/theme.mjs';
import fs from 'fs';
import banner from '../utils/banner.mjs';

/**
 * Calculate number of cores to use based on user input
 * @param {string|number} coresOption - 'half', 'all', 'single', or a number
 * @param {number} maxCores - Maximum available cores
 * @returns {number} Number of cores to use
 */
function calculateCores(coresOption, maxCores) {
    if (typeof coresOption === 'number') {
        // User specified a number - cap at max cores
        return Math.min(coresOption, maxCores);
    }
    
    const option = String(coresOption).toLowerCase().trim();
    
    switch (option) {
        case 'half':
            return Math.max(1, Math.floor(maxCores / 2));
        case 'all':
            return maxCores;
        case 'single':
            return 1;
        default:
            // Try to parse as number
            const num = parseInt(option);
            if (!isNaN(num) && num > 0) {
                return Math.min(num, maxCores);
            }
            // Default to half if invalid
            return Math.max(1, Math.floor(maxCores / 2));
    }
}

// Track if cluster listeners are already set up (prevent duplicates)
let clusterListenersSetup = false;

/**
 * Validate that FUZZ placeholder exists in the request
 * This prevents wasting time if no FUZZ parameter is found
 * @param {string} url - The URL to check
 * @param {string} data - Request body data
 * @param {Array|Object} headers - Request headers (array of "key:value" or object)
 * @returns {boolean} True if FUZZ found, false otherwise
 */
function validateFuzzPlaceholder(url, data, headers) {
    // Check URL
    if (url && typeof url === 'string' && url.includes('FUZZ')) {
        return true;
    }
    
    // Check request body
    if (data) {
        if (typeof data === 'string' && data.includes('FUZZ')) {
            return true;
        }
        if (typeof data === 'object') {
            try {
                const dataStr = JSON.stringify(data);
                if (dataStr.includes('FUZZ')) {
                    return true;
                }
            } catch (e) {
                // If can't stringify, check as string
                if (String(data).includes('FUZZ')) {
                    return true;
                }
            }
        }
    }
    
    // Check headers - can be array of "key:value" strings or object
    if (headers) {
        if (Array.isArray(headers)) {
            // Array format: ["key:value", "key2:value2"]
            for (const header of headers) {
                if (typeof header === 'string' && header.includes('FUZZ')) {
                    return true;
                }
            }
        } else if (typeof headers === 'object') {
            // Object format: {key: "value", key2: "value2"}
            for (const [key, value] of Object.entries(headers)) {
                if ((typeof key === 'string' && key.includes('FUZZ')) ||
                    (typeof value === 'string' && value.includes('FUZZ'))) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

async function clusterEngine(argv){
    if(cluster.isPrimary){
        // Set max listeners to prevent warnings (we use multiple workers)
        cluster.setMaxListeners(0); // 0 = unlimited
        
        // Show banner first - professional touch (skip if JSON output for clean output)
        if (!argv.json) {
            banner();
            process.stdout.write('\n');
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
        let wordlistCount = 0;
        try {
            const fileStream = fs.createReadStream(argv.wordlist, { encoding: 'utf-8' });
            const readline = (await import('readline')).default;
            const rl = readline.createInterface({
                input: fileStream,
                crlfDelay: Infinity
            });
            
            for await (const line of rl) {
                if (line.trim()) wordlistCount++;
            }
        } catch (error) {
            // If we can't count, use a default
            wordlistCount = 0;
        }

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

        // Handle worker shutdown
        process.on('SIGTERM', () => {
            process.exit(0);
        });

        try {
            await builder.requestHander(argv);
        } catch (error) {
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