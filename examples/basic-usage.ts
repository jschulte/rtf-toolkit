/**
 * Basic Usage Example
 * Demonstrates RTF parsing and HTML rendering
 */

import { parseRTF, toHTML } from '../src/index.js';

// Example 1: Simple formatted text
console.log('=== Example 1: Simple Formatted Text ===\n');

const rtf1 = '{\\rtf1\\ansi\\b Bold text\\b0  and \\i italic text\\i0}';
const doc1 = parseRTF(rtf1);
const html1 = toHTML(doc1);

console.log('RTF Input:', rtf1);
console.log('\nHTML Output:', html1);
console.log('\n');

// Example 2: Multiple paragraphs with formatting
console.log('=== Example 2: Multiple Paragraphs ===\n');

const rtf2 = `{\\rtf1\\ansi
First paragraph with \\b bold\\b0  text.\\par
Second paragraph with \\i italic\\i0  text.\\par
Third paragraph with \\b\\i both\\b0\\i0.}`;

const doc2 = parseRTF(rtf2);
const html2 = toHTML(doc2);

console.log('RTF Input:', rtf2);
console.log('\nHTML Output:', html2);
console.log('\n');

// Example 3: Font sizes and colors
console.log('=== Example 3: Fonts and Colors ===\n');

const rtf3 = `{\\rtf1\\ansi
{\\fonttbl{\\f0 Arial;}{\\f1 Times New Roman;}}
{\\colortbl;\\red255\\green0\\blue0;\\red0\\green128\\blue0;}
{\\f0\\fs24 This is 12pt Arial.}\\par
{\\f1\\fs32\\cf1 This is 16pt Times in red.}\\par
{\\cf2 This is green text.}}`;

const doc3 = parseRTF(rtf3);
const html3 = toHTML(doc3);

console.log('RTF Input:', rtf3);
console.log('\nHTML Output:', html3);
console.log('\n');

// Example 4: Paragraph alignment and spacing
console.log('=== Example 4: Alignment and Spacing ===\n');

const rtf4 = `{\\rtf1\\ansi
\\ql Left aligned paragraph\\par
\\qc Centered paragraph\\par
\\qr Right aligned paragraph\\par
\\sb240\\sa120 Paragraph with spacing before and after}`;

const doc4 = parseRTF(rtf4);
const html4 = toHTML(doc4);

console.log('RTF Input:', rtf4);
console.log('\nHTML Output:', html4);
console.log('\n');

// Example 5: Nested formatting
console.log('=== Example 5: Nested Formatting ===\n');

const rtf5 = '{\\rtf1 Normal text {\\b bold text {\\i bold and italic} just bold} normal again}';
const doc5 = parseRTF(rtf5);
const html5 = toHTML(doc5);

console.log('RTF Input:', rtf5);
console.log('\nHTML Output:', html5);
console.log('\n');

// Example 6: Real-world document
console.log('=== Example 6: Real-World Document ===\n');

const rtf6 = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Calibri;}}
{\\colortbl;\\red0\\green0\\blue255;}
{\\*\\generator @jonahschulte/rtf-toolkit}
\\f0\\fs22
\\qc\\b\\fs28 Document Title\\b0\\fs22\\par
\\ql\\par
This is the first paragraph of the document. It contains \\b bold\\b0, \\i italic\\i0, and \\ul underlined\\ul0  text.\\par
\\par
The second paragraph demonstrates \\cf1 colored text\\cf0  and different \\fs32 font sizes\\fs22.\\par
\\par
\\qr This paragraph is right-aligned.\\par
\\qc This paragraph is centered.}`;

const doc6 = parseRTF(rtf6);
const html6 = toHTML(doc6);

console.log('RTF Input (truncated):', rtf6.substring(0, 200) + '...');
console.log('\nHTML Output:', html6);
console.log('\n');

// Show AST structure
console.log('=== AST Structure ===\n');
console.log('Document has', doc6.content.length, 'paragraphs');
console.log('Font table:', doc6.fontTable);
console.log('Color table:', doc6.colorTable);
console.log('\n');

console.log('✅ All examples completed successfully!');
console.log('\n🎉 The RTF toolkit is working!');
