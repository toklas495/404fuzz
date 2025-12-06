let total = 0;
let errors = 0;
let lastTotal = 0;
let peakRps = 0;
let dashboardInterval = null;
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

  // Move cursor below banner (don't clear screen - banner is already shown)
  // Just move to a good position for dashboard
  process.stdout.write("\x1b[?25l"); // Hide cursor
  process.stdout.write("\n"); // New line after banner

  drawBox(0, 0, "INITIALIZING...");

  // Start dashboard refresh interval - faster refresh for better UX
  if (dashboardInterval) {
    clearInterval(dashboardInterval);
  }
  dashboardInterval = setInterval(() => {
    if (!isCleanedUp) {
      drawDashboard();
    }
  }, 250); // Faster refresh (250ms instead of 500ms)
}

/* ✅ MASTER ONLY */
export function updateStats(successInc = 0, errorInc = 0) {
  if (!isCleanedUp) {
    total += successInc;
    errors += errorInc;
  }
}

/* ✅ MAIN DRAW FUNCTION */
export function drawDashboard() {
  if (isCleanedUp) return;

  const now = Date.now();
  const elapsed = Math.floor((now - startTime) / 1000);
  
  // Calculate RPS based on last second
  const rps = total - lastTotal;
  lastTotal = total;

  if (rps > peakRps) peakRps = rps;

  const progress = totalPlanned > 0
    ? Math.min(((total / totalPlanned) * 100).toFixed(1), 100.0)
    : "0.0";

  const remaining = Math.max(0, totalPlanned - total);
  const eta = rps > 0 && remaining > 0 ? Math.floor(remaining / rps) : 0;

  const lines = [
    `🔥 CLUSTER RPS: ${rps}   🚀 Peak: ${peakRps}`,
    `✅ Total: ${total}/${totalPlanned || '∞'}   ❌ Errors: ${errors}`,
    `📊 Progress: ${progress}%   ⏱ Elapsed: ${elapsed}s   ⏳ ETA: ${eta}s`
  ];

  drawBox(0, 0, ...lines);
}

/* ✅ BOX DRAWER */
function drawBox(x, y, ...lines) {
  if (isCleanedUp) return;

  const width = 70;

  const top = "┌" + "─".repeat(width - 2) + "┐";
  const bottom = "└" + "─".repeat(width - 2) + "┘";

  // Clear previous dashboard area and redraw (simple approach)
  // Move to a fixed position below banner (approximately line 30)
  const startLine = 30;
  
  // Clear and redraw dashboard
  for (let i = 0; i < lines.length + 2; i++) {
    process.stdout.write(`\x1b[${startLine + i + 1};1H`);
    process.stdout.write('\x1b[K'); // Clear line
  }
  
  process.stdout.write(`\x1b[${startLine + 1};1H`);
  process.stdout.write(top);

  lines.forEach((line, i) => {
    process.stdout.write(`\x1b[${startLine + i + 2};1H`);
    const padded = line.padEnd(width - 4);
    process.stdout.write("│ " + padded + " │");
  });

  process.stdout.write(`\x1b[${startLine + lines.length + 2};1H`);
  process.stdout.write(bottom);

  // ✅ Move cursor BELOW the dashboard for results output
  process.stdout.write(`\x1b[${startLine + lines.length + 4};1H`);
}

// Removed move function - using direct ANSI codes in drawBox for better performance

/* ✅ CLEANUP FUNCTION */
export function cleanupDashboard() {
  if (isCleanedUp) return;
  
  isCleanedUp = true;
  
  if (dashboardInterval) {
    clearInterval(dashboardInterval);
    dashboardInterval = null;
  }

  // Move to end and show final stats
  process.stdout.write("\n"); // New line
  process.stdout.write("\x1b[?25h"); // Show cursor
  
  // Only show stats if dashboard was actually initialized
  if (isInitialized) {
    // Final stats - professional summary
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const avgRps = elapsed > 0 ? Math.floor(total / elapsed) : 0;
    
    process.stdout.write(`\n${'='.repeat(70)}\n`);
    process.stdout.write(`✅ Fuzzing completed successfully!\n`);
    process.stdout.write(`📊 Total Requests: ${total} | Errors: ${errors}\n`);
    process.stdout.write(`⏱  Time Elapsed: ${elapsed}s | Average RPS: ${avgRps}\n`);
    process.stdout.write(`🚀 Peak RPS: ${peakRps}\n`);
    process.stdout.write(`${'='.repeat(70)}\n\n`);
  } else {
    // Dashboard was never initialized - just restore cursor
    // Don't show misleading "completed successfully" message
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
