import { describe, it, expect } from 'vitest';
import { formatLine, stripQuotedReply } from '../src/format.js';

describe('formatLine', () => {
  it('basic formatting', () => {
    expect(formatLine('Alice', 'hello')).toBe('[Alice]: hello');
  });

  it('trims whitespace', () => {
    expect(formatLine('Bob', '  hello  ')).toBe('[Bob]: hello');
  });

  it('collapses excessive newlines', () => {
    expect(formatLine('Alice', 'line1\n\n\n\nline2')).toBe('[Alice]: line1\n\nline2');
  });

  it('preserves single newlines', () => {
    expect(formatLine('Bob', 'line1\nline2')).toBe('[Bob]: line1\nline2');
  });
});

describe('stripQuotedReply', () => {
  it('strips Gmail-style quoted reply', () => {
    const body = 'Sounds good!\n\nOn Mon, Jan 1, 2024 at 10:00 AM Alice <alice@example.com> wrote:\n> original message';
    expect(stripQuotedReply(body)).toBe('Sounds good!');
  });

  it('strips Outlook-style quoted reply', () => {
    const body = 'Sure thing!\n\n________________________________\nFrom: Alice\nSent: Monday\nSubject: WA Thread';
    expect(stripQuotedReply(body)).toBe('Sure thing!');
  });

  it('strips > quoted lines', () => {
    const body = 'Yes!\n> previous message\n> more quoted';
    expect(stripQuotedReply(body)).toBe('Yes!');
  });

  it('strips "From:" style', () => {
    const body = 'Got it\n\nFrom: someone@example.com\nTo: me@example.com';
    expect(stripQuotedReply(body)).toBe('Got it');
  });

  it('strips "-- Original Message" style', () => {
    const body = 'OK!\n\n-- Original Message --\nblah blah';
    expect(stripQuotedReply(body)).toBe('OK!');
  });

  it('clean reply with no history', () => {
    expect(stripQuotedReply('Just a clean reply')).toBe('Just a clean reply');
  });

  it('returns [empty reply] when stripping leaves nothing', () => {
    const body = 'On Mon, Jan 1, 2024 at 10:00 AM Alice wrote:\n> all quoted';
    expect(stripQuotedReply(body)).toBe('[empty reply]');
  });
});
