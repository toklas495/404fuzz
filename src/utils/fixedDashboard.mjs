let total = 0;
let errors = 0;
let lastTotal = 0;
let peakRps = 0;
let isCleanedUp = false;
let isInitialized = false; // Track if dashboard was initialized

let totalPlanned = 0;
let startTime = Date.now();


/* ✅ INIT */
export function initDashboard(plannedTotal) {
  totalPlanned = plannedTotal;
  startTime = Date.now();
  isCleanedUp = false;
  isInitialized = true; // Mark as initialized
  total = 0;
  errors = 0;
  lastTotal = 0;
  peakRps = 0;

  // reserve 8 line for dashboard decoration + line count 

  // Move cursor below banner (don't clear screen - banner is already shown)
  // Just move to a good position for dashboard
  process.stdout.write("\x1b[?25l"); // Hide cursor
  process.stdout.write("\n"); // New line after banner
}

/* ✅ MASTER ONLY */
export function updateStats(successInc = 0, errorInc = 0) {
  if (!isCleanedUp) {
    total += successInc;
    errors += errorInc;
  }
}

/* ✅ CLEANUP (clear dashboard, restore cursor, print final summary once) */
export function cleanupDashboard() {
  if (isCleanedUp) return;
  isCleanedUp = true;

  // Save cursor, go to bottom, clear dashboard area then restore cursor
  process.stdout.write("\x1b7");
  process.stdout.write("\x1b[999B");
  for (let i = 0; i < 6; i++) { // 6 lines should be enough for our dashboard
    process.stdout.write("\x1b[2K\n");
  }
  process.stdout.write("\x1b8");
  process.stdout.write("\x1b[?25h"); // show cursor

  // Final summary once
  if (isInitialized) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const avgRps = elapsed > 0 ? Math.floor(total / elapsed) : 0;

    process.stdout.write(`\n${'='.repeat(70)}\n`);
    process.stdout.write(`✅ Fuzzing completed successfully!\n`);
    process.stdout.write(`📊 Total Requests: ${total} | Errors: ${errors}\n`);
    process.stdout.write(`⏱  Time Elapsed: ${elapsed}s | Average RPS: ${avgRps}\n`);
    process.stdout.write(`🚀 Peak RPS: ${peakRps}\n`);
    process.stdout.write(`${'='.repeat(70)}\n\n`);
  }
}



/* ✅ RESTORE TERMINAL ON EXIT */
process.on("exit", () => {
  // Only cleanup if dashboard was actually initialized
  // This prevents cleanup from running on early validation errors
  if (isInitialized && !isCleanedUp) {
    cleanupDashboard();
  } else if (!isInitialized) {
    // Dashboard never initialized - just restore cursor
    process.stdout.write("\x1b[?25h"); // Show cursor
  }
});

// Note: SIGINT is handled in clusterEngine for proper worker cleanup
