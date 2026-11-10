import React from 'react';

const LIST_ITEM = /^\s*(?:[-*+]\s+|\d+[.)]\s+)/;
const TABLE_DIVIDER_CELL = /^:?-{3,}:?$/;

function cellsFrom(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
}

function isTableDivider(line) {
  const cells = cellsFrom(line);
  return cells.length > 1 && cells.every((cell) => TABLE_DIVIDER_CELL.test(cell));
}

function inlineParts(text, keyPrefix) {
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  return text.split(pattern).filter(Boolean).map((part, index) => {
    const key = `${keyPrefix}-${index}`;
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('__') && part.endsWith('__')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={key} className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.9em]">{part.slice(1, -1)}</code>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) {
      return <a key={key} href={link[2]} target="_blank" rel="noreferrer" className="font-semibold text-[#0B5A9C] underline">{link[1]}</a>;
    }
    return part.replace(/\s*\|+\s*/g, ' · ');
  });
}

function isBlockStart(lines, index) {
  const line = lines[index];
  return /^#{1,3}\s+/.test(line)
    || /^\s*```/.test(line)
    || /^\s*>/.test(line)
    || LIST_ITEM.test(line)
    || (line.includes('|') && lines[index + 1] && isTableDivider(lines[index + 1]));
}

export default function FormattedAssistantMessage({ text }) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trim();
    if (!line || /^([-*_]\s*){3,}$/.test(line)) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const Tag = heading[1].length <= 2 ? 'h3' : 'h4';
      blocks.push(<Tag key={`heading-${index}`} className="mb-1 mt-2 font-bold text-slate-800">{inlineParts(heading[2], `heading-${index}`)}</Tag>);
      index += 1;
      continue;
    }

    if (line.startsWith('```')) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      blocks.push(<pre key={`code-${index}`} className="my-2 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100"><code>{codeLines.join('\n')}</code></pre>);
      continue;
    }

    if (line.includes('|') && lines[index + 1] && isTableDivider(lines[index + 1])) {
      const headers = cellsFrom(line);
      index += 2;
      const rows = [];
      while (index < lines.length && lines[index].trim().includes('|')) {
        rows.push(cellsFrom(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="my-2 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead className="bg-[#edf8fa] text-slate-700"><tr>{headers.map((cell, cellIndex) => <th key={cellIndex} className="border-b border-slate-200 px-2.5 py-2 font-bold">{inlineParts(cell, `th-${index}-${cellIndex}`)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className={rowIndex % 2 ? 'bg-slate-50' : 'bg-white'}>{headers.map((_, cellIndex) => <td key={cellIndex} className="border-b border-slate-100 px-2.5 py-2 align-top text-slate-700">{inlineParts(row[cellIndex] || '', `td-${index}-${rowIndex}-${cellIndex}`)}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (LIST_ITEM.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const Tag = ordered ? 'ol' : 'ul';
      const items = [];
      while (index < lines.length && LIST_ITEM.test(lines[index])) {
        items.push(lines[index].replace(LIST_ITEM, ''));
        index += 1;
      }
      blocks.push(<Tag key={`list-${index}`} className={`my-1 space-y-0.5 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>{items.map((item, itemIndex) => <li key={itemIndex}>{inlineParts(item, `li-${index}-${itemIndex}`)}</li>)}</Tag>);
      continue;
    }

    if (line.startsWith('>')) {
      const quote = [];
      while (index < lines.length && lines[index].trim().startsWith('>')) {
        quote.push(lines[index].trim().replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`} className="my-2 border-l-2 border-[#38C6DC] pl-3 text-slate-600">{inlineParts(quote.join(' '), `quote-${index}`)}</blockquote>);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isBlockStart(lines, index)) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push(<p key={`paragraph-${index}`} className="my-1 whitespace-pre-wrap">{inlineParts(paragraph.join(' '), `p-${index}`)}</p>);
  }

  return <div className="space-y-1">{blocks}</div>;
}
