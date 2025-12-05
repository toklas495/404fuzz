# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-XX

### Added
- **Banner Display**: Professional ASCII banner shown at startup before dashboard
- **CPU Core Control**: New `--cores` / `-c` argument to control CPU utilization
  - Options: `half` (default), `all`, `single`, or specific number (e.g., `2`, `3`, `4`)
  - Automatically caps at maximum available cores
  - Prevents full CPU utilization by default
- **Professional Dashboard**: Real-time fuzzing statistics dashboard
  - Cluster RPS (Requests Per Second) tracking
  - Peak RPS monitoring
  - Progress percentage with ETA calculation
  - Error tracking
  - Faster refresh rate (250ms) for smoother updates
- **Wordlist Validation**: Comprehensive wordlist file validation
  - Checks file existence and readability before starting workers
  - Validates file is not a directory
  - Provides helpful error messages with suggestions
- **Graceful Shutdown**: Proper Ctrl+C (SIGINT) handling
  - Kills all workers gracefully
  - Restores terminal state
  - Shows final statistics summary
- **Error Handling**: Professional error handling throughout
  - CliError class for structured error handling
  - Color-coded error messages
  - Helpful suggestions for common errors
  - Errors only printed from worker 0 to avoid spam
- **Output Formatting**: Clean, professional output similar to ffuf
  - Color-coded HTTP status codes
  - Formatted output: `[Status] fuzz_word [Size] [Time]`
  - Truncates long fuzz words for readability
- **Cluster Architecture**: Multi-core fuzzing engine
  - Automatic worker distribution across CPU cores
  - Wordlist sharding across workers for optimal performance
  - Real-time RPS aggregation from all workers
- **Event Listener Management**: Fixed MaxListenersExceededWarning
  - Proper listener setup to prevent memory leaks
  - Single shared message handlers
  - Efficient event emitter configuration

### Changed
- **Dashboard Refresh**: Increased refresh rate from 500ms to 250ms for better UX
- **Error Messages**: Improved error messages with context and suggestions
- **Output Format**: Enhanced output formatting for better readability
- **Worker Management**: Optimized worker lifecycle management

### Fixed
- **Ctrl+C Handling**: Fixed issue where Ctrl+C didn't properly stop fuzzing
- **Wordlist Errors**: Fixed silent failures when wordlist file not found
- **Dashboard Cleanup**: Fixed terminal restoration on exit
- **Event Listeners**: Fixed MaxListenersExceededWarning by preventing duplicate listeners
- **Variable Scope**: Fixed workerId scope issue in build.mjs
- **Error Propagation**: Fixed error handling and propagation throughout codebase

### Performance
- Optimized dashboard drawing with direct ANSI codes
- Faster wordlist counting
- Improved resource management
- Better memory usage with proper cleanup

### Documentation
- Comprehensive README.md with installation and usage instructions
- Professional CHANGELOG.md tracking all changes
- Code comments and documentation

---

## [Unreleased]

### Planned Features
- JSON output format option
- Custom matchers and filters
- Rate limiting options
- Proxy support
- Cookie support
- Follow redirects option
- Output to file option

