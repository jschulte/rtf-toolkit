/**
 * Track Changes Demo
 * Demonstrates parsing and extracting track changes from RTF documents
 */

import { parseRTF, toHTML, getTrackChanges, getTrackChangeMetadata } from '../src/index.js';

console.log('='.repeat(70));
console.log('RTF TOOLKIT - TRACK CHANGES DEMO');
console.log('='.repeat(70));
console.log('\n');

// Example 1: Simple insertion
console.log('=== Example 1: Simple Insertion ===\n');

const rtf1 = `{\\rtf1
{\\*\\revtbl{Unknown;}{John Doe;}}
This document contains {\\revised\\revauth1\\revdttm1234567890 new text} in it.}`;

const doc1 = parseRTF(rtf1);
const changes1 = getTrackChanges(doc1);
const html1 = toHTML(doc1);

console.log('RTF Input:', rtf1.replace(/\n/g, ' ').substring(0, 100) + '...');
console.log('\nTrack Changes Found:', changes1.length);
changes1.forEach((change) => {
  console.log(`  - ${change.type.toUpperCase()}: "${change.text}" by ${change.author}`);
  if (change.timestamp) {
    console.log(`    Date: ${change.timestamp.toLocaleString()}`);
  }
});
console.log('\nHTML Output (with track changes visualization):');
console.log(html1);
console.log('\n');

// Example 2: Multiple changes by different authors
console.log('=== Example 2: Multiple Changes by Different Authors ===\n');

const rtf2 = `{\\rtf1
{\\*\\revtbl{Unknown;}{Alice;}{Bob;}{Carol;}}
{\\fonttbl{\\f0 Arial;}}
The contract states {\\revised\\revauth1 the new terms} are effective immediately.\\par
The old clause {\\deleted\\revauth2 about termination} has been removed.\\par
Additional {\\revised\\revauth3 provisions for security} have been added.}`;

const doc2 = parseRTF(rtf2);
const changes2 = getTrackChanges(doc2);
const metadata2 = getTrackChangeMetadata(doc2);
const html2 = toHTML(doc2);

console.log('Document Summary:');
console.log(`  Total Changes: ${metadata2.totalChanges}`);
console.log(`  Insertions: ${metadata2.insertions}`);
console.log(`  Deletions: ${metadata2.deletions}`);
console.log(`  Authors: ${metadata2.authors.join(', ')}`);
console.log(`  Has Revisions: ${metadata2.hasRevisions}`);

console.log('\nDetailed Changes:');
changes2.forEach((change, i) => {
  console.log(`\n  Change ${i + 1}:`);
  console.log(`    ID: ${change.id}`);
  console.log(`    Type: ${change.type}`);
  console.log(`    Author: ${change.author} (index ${change.authorIndex})`);
  console.log(`    Text: "${change.text}"`);
  console.log(`    Position: Paragraph ${change.position.paragraphIndex}, Offset ${change.position.characterOffset}`);
});

console.log('\nHTML Output:');
console.log(html2);
console.log('\n');

// Example 3: Complex government contract scenario
console.log('=== Example 3: Government Contract with Track Changes ===\n');

const rtf3 = `{\\rtf1\\ansi
{\\*\\revtbl{Unknown;}{Legal Team;}{Compliance Officer;}{Contracting Officer;}}
{\\fonttbl{\\f0 Calibri;}}
{\\colortbl;\\red0\\green0\\blue255;}
{\\qc\\b\\fs28 NON-DISCLOSURE AGREEMENT\\b0\\fs22\\par}
\\par
This Agreement is entered into on {\\revised\\revauth1 January 15, 2025} between:\\par
\\par
{\\b WHEREAS} the parties wish to {\\deleted\\revauth2 share confidential} {\\revised\\revauth2 exchange proprietary} information;\\par
\\par
{\\b NOW THEREFORE} the parties agree to the following terms {\\revised\\revauth3 and conditions as amended}:\\par
\\par
1. The receiving party shall {\\deleted\\revauth1 not disclose} {\\revised\\revauth1 maintain strict confidentiality of} all information.\\par
\\par
2. This agreement shall remain in effect for {\\revised\\revauth3 two (2) years} from the effective date.}`;

const doc3 = parseRTF(rtf3);
const changes3 = getTrackChanges(doc3);
const metadata3 = getTrackChangeMetadata(doc3);

console.log('📄 Government Contract Analysis:\n');
console.log(`Total Track Changes: ${metadata3.totalChanges}`);
console.log(`  - Insertions: ${metadata3.insertions}`);
console.log(`  - Deletions: ${metadata3.deletions}`);
console.log(`Authors: ${metadata3.authors.join(', ')}`);

console.log('\n📝 Changes by Author:\n');
metadata3.authors.forEach((author) => {
  const authorChanges = changes3.filter((c) => c.author === author);
  console.log(`${author}:`);
  authorChanges.forEach((change) => {
    const icon = change.type === 'insertion' ? '✅' : '❌';
    console.log(`  ${icon} ${change.type}: "${change.text.substring(0, 50)}${change.text.length > 50 ? '...' : ''}"`);
  });
  console.log('');
});

console.log('🔍 Detailed Change List:\n');
changes3.forEach((change, i) => {
  console.log(`[${i + 1}] ${change.type.toUpperCase()}`);
  console.log(`    Author: ${change.author}`);
  console.log(`    Text: "${change.text}"`);
  console.log(`    Location: Para ${change.position.paragraphIndex}`);
  console.log('');
});

console.log('📊 HTML Output (Track Changes Highlighted):\n');
const html3 = toHTML(doc3);
console.log(html3);
console.log('\n');

console.log('='.repeat(70));
console.log('✅ TRACK CHANGES DEMO COMPLETE');
console.log('='.repeat(70));
console.log('\n💡 Key Capabilities Demonstrated:\n');
console.log('  ✓ Parse RTF with track changes');
console.log('  ✓ Extract revision table (authors)');
console.log('  ✓ Identify insertions and deletions');
console.log('  ✓ Get author and timestamp metadata');
console.log('  ✓ Generate statistics and summaries');
console.log('  ✓ Visualize changes in HTML output');
console.log('  ✓ Track change positions in document');
console.log('\n🚀 Ready for government contract review workflows!');
