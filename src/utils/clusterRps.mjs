import { updateStats } from "./fixedDashboard.mjs";

// Track which workers already have listeners
const workerListeners = new Set();
let forkListenerSetup = false;

// Central message handler for all workers
function handleWorkerMessage(msg) {
  if (!msg || !msg.type) return;

  if (msg.type === "rps-success") {
    updateStats(msg.count, 0);
  }
  if (msg.type === "rps-error") {
    updateStats(0, msg.count);
  }
}

export function setUpClusterRps(cluster) {
  // Setup listeners for all existing workers
  for (const id in cluster.workers) {
    const worker = cluster.workers[id];
    
    // Only add listener if not already added
    if (!workerListeners.has(worker.id)) {
      worker.on("message", handleWorkerMessage);
      workerListeners.add(worker.id);
    }
  }

  // Setup fork listener only once (not every time this function is called)
  if (!forkListenerSetup) {
    cluster.on('fork', (worker) => {
      // Add message listener to newly forked worker
      if (!workerListeners.has(worker.id)) {
        worker.on("message", handleWorkerMessage);
        workerListeners.add(worker.id);
      }
    });
    
    forkListenerSetup = true;
  }
}
