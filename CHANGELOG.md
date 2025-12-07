# Changelog

All notable changes to this project will be documented here.  
Format based on Keep a Changelog & Semantic Versioning.

---

## [1.3.0] - 2025-12-07

### Added
- Master-only output writer (IPC based)
- Safe JSONL streaming output
- Backpressure handling with `.write()` + `drain`
- Crash-safe output file closing

### Changed
- Workers no longer write to file or stdout
- All output controlled by master process
- Results are streamed (no memory storage)
- `--json` mode is now 100% clean (no banner, no UI)

### Removed
- Real-time dashboard
- Worker-side file streams
- Unsafe concurrent write locks

### Fixed
- Broken / mixed JSON output in cluster mode
- Multi-process file corruption
- Memory spikes during long fuzz runs
- Truncated output files

### Performance
- Higher RPS
- Lower RAM usage
- Zero blocking I/O in workers

---

### Added
- Initial release
- Banner
- Cluster fuzzing
- `--cores` CPU control
- Wordlist validation
- Graceful shutdown
- ffuf-style output

---

## [Unreleased]
- Proxy support
- Cookie support
- Redirect handling
