# Timeline Workflow Preview

Preview timeline workflow diagrams directly from `workflow` code blocks in Markdown.

Edit your Markdown or switch to another Markdown document and the preview updates automatically.

![Markdown editor and live workflow preview](https://raw.githubusercontent.com/zohiro00/timeline-workflow-generator/main/vscode-extension/images/preview.png)

## Usage

1. Open a Markdown file.
2. Add a `workflow` code block.
3. Run **Timeline Workflow: Open Preview** from the Command Palette or select the preview icon in the editor title.
4. Edit the Markdown and check the live preview beside the editor.

## Example

````markdown
```workflow
# Purchase Approval

## lanes
- requester: Requester
- manager: Manager
- finance: Finance

## nodes
- requester
  - draft: Create request
- manager
  - review: Review
- finance
  - budget: Check budget

## workflow
- draft -> review -> budget
```
````

## Current limitations

- Only the first `workflow` block in the active Markdown document is previewed.
- Export is currently available from the web application, not from the extension.
- Syntax highlighting and code completion are not included.
- VS Code for the Web is not supported in version 0.1.0.

## Web application

For editable PowerPoint, SVG, PNG, and image export, use the [Timeline Workflow Generator web application](https://timeline-workflow-generator.tomokiku0998.workers.dev/).

## License

MIT
