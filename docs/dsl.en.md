# Workflow Syntax Reference

English | [日本語](dsl.md)

Timeline Workflow Generator creates a timeline workflow diagram from a `workflow` code block in Markdown or from workflow source entered directly. Horizontal node positions are calculated from dependencies, so you never specify coordinates or spacing.

## Minimal example

```workflow
# Request Workflow Timeline

## lanes
- requester: Requester
- approver: Approver

## nodes
- requester
  - a1: Create
  - a2: Submit
- approver
  - b1: Approve

## workflow
- a1 -> a2 -> b1
```

In a Markdown document, wrap the source in a fenced code block beginning with `workflow`. When a document contains multiple workflow blocks, the first block is currently used.

## Title

The first `# Title` becomes the diagram title. When omitted, the application uses a locale-specific default: `Timeline Workflow` in English or `時系列ワークフロー` in Japanese.

## lanes

Define lanes from top to bottom in the `## lanes` section:

```workflow
## lanes
- reception: Reception
- investigation: Investigation
- recovery: Recovery
```

The format is `- laneId: laneLabel`. IDs may contain ASCII letters, numbers, `_`, and `-`. IDs must be unique and labels cannot be empty. Use `<br>` for an explicit line break in a label.

## nodes

In `## nodes`, write a parent lane as `- laneId`, followed by its nodes indented with two spaces:

```workflow
## nodes
- reception
  - a1: Receive inquiry
  - a2: Initial check
- recovery
  - b1: Recovery work
```

Node IDs follow the same character rules as lane IDs and must be unique. Only nodes referenced by a dependency in `## workflow` are rendered.

### Highlighting a node

Add `[highlight]` immediately after one node ID to emphasize it:

```workflow
## nodes
- reception
  - a1 [highlight]: Receive inquiry
  - a2: Initial check
```

At most one node can be highlighted in a workflow. Highlighting does not change layout, and an unreferenced highlighted node is still omitted.

## workflow

Define dependencies as a Markdown list:

```workflow
## workflow
- a1 -> a2
- a2 -.-> b1
- b1 -.- a3
- a3 -x- b2
- b2 .x. a4
- a3 ~> a4
```

| Syntax | Type | Output |
| --- | --- | --- |
| `a -> b` | Solid arrow | Solid line with an arrow |
| `a -.-> b` | Dotted arrow | Dotted line with an arrow |
| `a -.- b` | Dotted dependency | Dotted line without an arrow |
| `a -x- b` | Rejected dependency | Solid line with a cross near the end |
| `a .x. b` | Dotted rejected dependency | Dotted line with a cross near the end |
| `a ~> b` | Invisible dependency | Affects timeline order without drawing a line |

Both ends must be IDs of defined nodes. Consecutive dependencies can be chained on one line:

```workflow
- a1 -> a2 -> b1 -> b2
```

This is equivalent to three separate dependency entries.

## Comments

Text following `%%` is treated as a comment. `#` is reserved for Markdown headings and is not a comment marker.

```workflow
## lanes
- requester: Requester %% top lane
```

## Common errors

The parser reports the source line and a correction-oriented message for missing sections, empty labels, invalid indentation, duplicate IDs, undefined lanes or nodes, unsupported attributes, invalid arrows, and cyclic dependencies.

A cycle prevents the application from calculating horizontal timeline positions. Update the arrows until the dependency graph is a DAG.

## Using the result in PowerPoint

1. Write the workflow in the Engine.
2. Check the preview.
3. Export PPTX, SVG, or PNG, or copy the image.
4. Open PPTX to edit node shapes and standard connectors in PowerPoint.
5. Paste SVG, PNG, or the copied image when an image is more appropriate.
