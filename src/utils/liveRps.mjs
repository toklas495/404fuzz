let localSuccess = 0;
let localErrors = 0;
let rpsInterval = null;
// ✅ Flush stats to master every 250ms

export function startRpsFlush(){
    if(rpsInterval) return;

    rpsInterval = setInterval(() => {
      if (!process.send) return;
      
      if (localSuccess > 0) {
        process.send({ type: "rps-success", count: localSuccess });
        localSuccess = 0;
      }

      if (localErrors > 0) {
        process.send({ type: "rps-error", count: localErrors });
        localErrors = 0;
      }
  }, 250);

    // allow process to exit even if this interval is still set
    if(rpsInterval.unref) rpsInterval.unref();
}

export function stopRpsFlush(){
  if(rpsInterval){
    clearInterval(rpsInterval);
    rpsInterval = null;
  }
}



export function markSuccess() {
  localSuccess++;
}

export function markError() {
  localErrors++;
}

export function calculateCores(coresOption, maxCores) {
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
