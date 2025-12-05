let localSuccess = 0;
let localErrors = 0;

// ✅ Flush stats to master every 250ms
setInterval(() => {
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

export function markSuccess() {
  localSuccess++;
}

export function markError() {
  localErrors++;
}
