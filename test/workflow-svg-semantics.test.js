import test from "node:test";
import assert from "node:assert/strict";
import { parseWorkflow, layoutWorkflow, renderWorkflowSvg } from "../src/workflow.js";

const source = `# Purchase
## lanes
- req: Requester
- fin: Finance
## nodes
- req
  - create: Create
  - approve: Approve
- fin
  - pay: Pay
## workflow
- create -> approve -> pay
### annotations
- create <- pay`;

test("SVG exports semantic selectors for nodes, edges and annotations", () => {
  const workflow = layoutWorkflow(parseWorkflow(source));
  const first = renderWorkflowSvg(workflow);
  const second = renderWorkflowSvg(workflow);
  assert.equal(first, second);
  assert.match(first, /<g id="node-create" data-node-id="create" class="node"/);
  assert.match(first, /<g id="node-approve" data-node-id="approve" class="node"/);
  assert.match(first, /<path id="edge-1" data-from="create" data-to="approve" class="edge"/);
  assert.match(first, /<path id="edge-2" data-from="approve" data-to="pay" class="edge"/);
  assert.match(first, /<path id="annotation-1" data-from="pay" data-to="create" class="annotation annotation-return"/);
});
