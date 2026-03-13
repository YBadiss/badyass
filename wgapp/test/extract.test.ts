import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { extractContent } from '../src/extract.js';

function loadFixture(name: string) {
  return JSON.parse(readFileSync(`test/fixtures/wa-messages/${name}.json`, 'utf-8'));
}

describe('extractContent', () => {
  it('plain text', () => {
    expect(extractContent(loadFixture('text'))).toBe('hey, are we meeting tomorrow?');
  });

  it('link preview → text only', () => {
    expect(extractContent(loadFixture('link-preview'))).toBe(
      'check this out https://example.com',
    );
  });

  it('quoted reply → prefixed quote + reply', () => {
    expect(extractContent(loadFixture('quoted-reply'))).toBe(
      '> hey, are we meeting tomorrow?\nYes, 6pm works',
    );
  });

  it('poll creation → formatted options', () => {
    expect(extractContent(loadFixture('poll-creation'))).toBe(
      '📊 Poll: Where should we eat?\n1. Thai\n2. Pizza\n3. Sushi',
    );
  });

  it('image with caption', () => {
    expect(extractContent(loadFixture('image'))).toBe('[sent an image: look at this]');
  });

  it('image without caption', () => {
    expect(extractContent(loadFixture('image-no-caption'))).toBe('[sent an image]');
  });

  it('video with caption', () => {
    expect(extractContent(loadFixture('video'))).toBe('[sent a video: check this out]');
  });

  it('GIF', () => {
    expect(extractContent(loadFixture('gif'))).toBe('[sent a GIF]');
  });

  it('audio/voice note', () => {
    expect(extractContent(loadFixture('audio'))).toBe('[sent a voice note]');
  });

  it('sticker', () => {
    expect(extractContent(loadFixture('sticker'))).toBe('[sent a sticker]');
  });

  it('document with filename', () => {
    expect(extractContent(loadFixture('document'))).toBe('[sent a file: report.pdf]');
  });

  it('location → Maps link', () => {
    expect(extractContent(loadFixture('location'))).toBe(
      '📍 https://maps.google.com/?q=48.8566,2.3522',
    );
  });

  it('live location → Maps link', () => {
    expect(extractContent(loadFixture('live-location'))).toBe(
      '📍 Live location: https://maps.google.com/?q=48.8584,2.2945',
    );
  });

  it('contact → name + phone', () => {
    expect(extractContent(loadFixture('contact'))).toBe(
      '[shared contact: Jane Doe, +33612345678]',
    );
  });

  it('reaction → null (skipped)', () => {
    expect(extractContent(loadFixture('reaction'))).toBeNull();
  });

  it('poll vote → null (skipped)', () => {
    expect(extractContent(loadFixture('poll-vote'))).toBeNull();
  });

  it('empty message → null', () => {
    expect(extractContent({ message: {} })).toBeNull();
  });

  it('no message field → null', () => {
    expect(extractContent({})).toBeNull();
  });
});
