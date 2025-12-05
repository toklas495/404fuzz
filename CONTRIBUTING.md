# Contributing to 404fuzz

First off, thank you for considering contributing to 404fuzz! It's people like you that make 404fuzz such a great tool.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find out that you don't need to create one. When you are creating a bug report, please include as many details as possible:

- **Clear title and description**
- **Steps to reproduce** the behavior
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Environment details** (OS, Node.js version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, please include:

- **Clear title and description**
- **Use case** - why is this feature useful?
- **Proposed solution** (if you have one)

### Pull Requests

1. Fork the repo and create your branch from `dev`
2. If you've added code that should be tested, add tests
3. Ensure the code follows the existing style
4. Update the documentation as needed
5. Write a clear commit message
6. Submit the pull request

## Development Process

### Setting Up Development Environment

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/404fuzz.git
cd 404fuzz

# Install dependencies
npm install

# Make executable
chmod +x app.mjs

# Link globally for testing
npm link
```

### Code Style

- Use ES6+ features
- Follow existing code style
- Use meaningful variable names
- Add comments for complex logic
- Keep functions focused and small

### Testing

Before submitting a PR, please test your changes:

```bash
# Test basic functionality
404fuzz fuzz https://example.com/FUZZ -w wordlist.txt

# Test with different options
404fuzz fuzz https://example.com/FUZZ -w wordlist.txt -c 4
```

### Commit Messages

- Use clear, descriptive commit messages
- Reference issue numbers if applicable
- Follow conventional commit format when possible

Example:
```
feat: Add JSON output format option
fix: Resolve memory leak in dashboard
docs: Update README with new examples
```

## Project Structure

```
404fuzz/
├── app.mjs                 # Main entry point
├── src/
│   ├── build.mjs           # Request builder
│   ├── cmdArguments/       # CLI argument parsing
│   ├── engine/            # Fuzzing engines
│   ├── handlers/          # Request/file handlers
│   └── utils/             # Utility functions
├── README.md
├── CHANGELOG.md
└── package.json
```

## Questions?

Feel free to open an issue for any questions or reach out to [@toklas495](https://twitter.com/toklas495) on Twitter.

Thank you for contributing! 🎉

