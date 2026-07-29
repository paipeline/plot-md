# Security policy

## Supported version

The latest release receives security fixes.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting for this repository:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include the affected directive, a minimal Markdown reproduction, impact, and any proposed mitigation.

Please do not disclose the issue publicly until a fix is available.

## Security model

Plot.md treats Markdown documents and project registries as untrusted input:

- document HTML is disabled;
- titles and metadata are escaped;
- registry values come from fixed enums;
- semantic images must use relative local paths;
- workspace CSS, scripts, remote resources, and executable templates are rejected;
- malformed or unclosed directives remain visible as ordinary Markdown.

The current prototype supports one trusted local workspace folder. Read `docs/spikes/vscode-preview-spikes.md` for the underlying VS Code API constraints.
