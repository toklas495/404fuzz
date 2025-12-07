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
