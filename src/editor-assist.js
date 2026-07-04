const indentUnit = "  ";

export function continueMarkdownList(value, selectionStart, selectionEnd) {
  if (selectionStart !== selectionEnd) return null;

  const line = getLineAt(value, selectionStart);
  const beforeCursor = value.slice(line.start, selectionStart);
  const listPrefix = beforeCursor.match(/^(\s*)-\s?(.*)$/);
  if (!listPrefix) return null;

  const fullLine = value.slice(line.start, line.end);
  const emptyListItem = fullLine.match(/^(\s*)-\s*$/);
  if (emptyListItem && selectionStart === line.end) {
    const replacement = emptyListItem[1];
    return replaceRange(value, line.start, line.end, replacement, line.start + replacement.length);
  }

  const nextPrefix = `\n${listPrefix[1]}- `;
  return replaceRange(value, selectionStart, selectionEnd, nextPrefix, selectionStart + nextPrefix.length);
}

export function indentMarkdownLines(value, selectionStart, selectionEnd, direction) {
  const bounds = getSelectedLineBounds(value, selectionStart, selectionEnd);
  const original = value.slice(bounds.start, bounds.end);
  const lines = original.split("\n");
  const transformed = lines.map((line) => {
    if (direction === "in") return `${indentUnit}${line}`;
    return line.replace(/^ {1,2}/, "");
  });
  const replacement = transformed.join("\n");

  return {
    value: `${value.slice(0, bounds.start)}${replacement}${value.slice(bounds.end)}`,
    selectionStart: mapPositionAfterLineTransform(lines, transformed, bounds.start, selectionStart),
    selectionEnd: mapPositionAfterLineTransform(lines, transformed, bounds.start, selectionEnd),
  };
}

export function moveSelectedLines(value, selectionStart, selectionEnd, direction) {
  const bounds = getSelectedLineBounds(value, selectionStart, selectionEnd);
  const block = value.slice(bounds.start, bounds.end);

  if (direction === "up") {
    if (bounds.start === 0) return null;

    const previousStart = value.lastIndexOf("\n", bounds.start - 2) + 1;
    const previousEnd = bounds.start - 1;
    const previousLine = value.slice(previousStart, previousEnd);
    const shift = previousLine.length + 1;

    return {
      value: `${value.slice(0, previousStart)}${block}\n${previousLine}${value.slice(bounds.end)}`,
      selectionStart: selectionStart - shift,
      selectionEnd: selectionEnd - shift,
    };
  }

  if (bounds.end === value.length) return null;

  const nextStart = bounds.end + 1;
  const nextLineBreak = value.indexOf("\n", nextStart);
  const nextEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const nextLine = value.slice(nextStart, nextEnd);
  const shift = nextLine.length + 1;

  return {
    value: `${value.slice(0, bounds.start)}${nextLine}\n${block}${value.slice(nextEnd)}`,
    selectionStart: selectionStart + shift,
    selectionEnd: selectionEnd + shift,
  };
}

function replaceRange(value, start, end, replacement, cursor) {
  return {
    value: `${value.slice(0, start)}${replacement}${value.slice(end)}`,
    selectionStart: cursor,
    selectionEnd: cursor,
  };
}

function getLineAt(value, position) {
  const start = value.lastIndexOf("\n", position - 1) + 1;
  const nextLineBreak = value.indexOf("\n", position);
  const end = nextLineBreak === -1 ? value.length : nextLineBreak;
  return { start, end };
}

function getSelectedLineBounds(value, selectionStart, selectionEnd) {
  const blockEnd = selectionEnd > selectionStart && value[selectionEnd - 1] === "\n"
    ? selectionEnd - 1
    : selectionEnd;
  const start = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const nextLineBreak = value.indexOf("\n", blockEnd);
  const end = nextLineBreak === -1 ? value.length : nextLineBreak;
  return { start, end };
}

function mapPositionAfterLineTransform(originalLines, transformedLines, blockStart, position) {
  let originalLineStart = blockStart;
  let transformedLineStart = blockStart;

  for (let index = 0; index < originalLines.length; index += 1) {
    const originalLine = originalLines[index];
    const transformedLine = transformedLines[index];
    const originalLineEnd = originalLineStart + originalLine.length;

    if (position <= originalLineEnd || index === originalLines.length - 1) {
      const column = position - originalLineStart;
      const removedIndent = originalLine.length - transformedLine.length;
      const nextColumn = removedIndent > 0
        ? Math.max(0, column - removedIndent)
        : column + transformedLine.length - originalLine.length;
      return transformedLineStart + nextColumn;
    }

    originalLineStart = originalLineEnd + 1;
    transformedLineStart += transformedLine.length + 1;
  }

  return transformedLineStart;
}
