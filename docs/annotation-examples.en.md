# Return Annotation Examples

English | [日本語](annotation-examples.md)

`### annotations` overlays failure, revision, retry, and other return paths without changing the timeline calculated from regular dependencies.

## 1. Code review

```workflow
# Code Review

## lanes
- development: Development
- review: Review
- delivery: Delivery

## nodes
- development
  - generate: Generate code
- review
  - inspect: Review
- delivery
  - deliver: Delivery

## workflow
- generate -> inspect -> deliver

### annotations
- generate <- inspect
```

## 2. Returned application

```workflow
# Returned Application

## lanes
- applicant: Applicant
- approver: Approver

## nodes
- applicant
  - draft: Create application
  - complete: Confirm completion
- approver
  - review: Review application

## workflow
- draft -> review -> complete

### annotations
- draft <- review
```

## 3. Reimplementation after a failed test

```workflow
# Test and Reimplementation

## lanes
- development: Development
- qa: QA
- operations: Operations

## nodes
- development
  - implement: Implement
- qa
  - test: Test
- operations
  - release: Release

## workflow
- implement -> test -> release

### annotations
- implement <- test
```

## 4. Batch validation retry

```workflow
# Batch Processing

## lanes
- system: System
- operator: Operator

## nodes
- system
  - prepare: Prepare data
  - process: Run batch
  - finish: Complete
- operator
  - validate: Validate result

## workflow
- prepare -> process -> validate -> finish

### annotations
- process <- validate
```

## 5. Multi-stage revision

```workflow
# Content Publishing

## lanes
- author: Author
- editor: Editor
- legal: Legal
- web: Web

## nodes
- author
  - write: Write draft
- editor
  - edit: Edit
- legal
  - legal_review: Legal review
- web
  - publish: Publish

## workflow
- write -> edit -> legal_review -> publish

### annotations
- write <- edit
- edit <- legal_review
```
