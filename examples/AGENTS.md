# Release Agent Plan

This agent prepares and validates releases.

:::smd-decision id="preview-engine" status="accepted" variant="comparison"
## Preview engine

| Option | Strength | Weakness |
|---|---|---|
| Built-in Preview | Native workflow | Less control |
| Custom Webview | Full control | More surface to rebuild |

**Outcome:** Extend the built-in preview.
:::

The source remains readable without the extension. With the extension installed, the decision becomes a structured comparison in VS Code's built-in Markdown Preview.
