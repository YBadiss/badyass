type Message = Record<string, unknown>;

export function extractContent(msg: { message?: Message }): string | null {
  const m = msg.message;
  if (!m) return null;

  // Plain text
  if (typeof m.conversation === 'string') {
    return m.conversation;
  }

  // Extended text (link previews, quoted replies)
  const ext = m.extendedTextMessage as Record<string, unknown> | undefined;
  if (ext && typeof ext.text === 'string') {
    const contextInfo = ext.contextInfo as Record<string, unknown> | undefined;
    const quoted = contextInfo?.quotedMessage as Record<string, unknown> | undefined;
    if (quoted) {
      const quotedText =
        (typeof quoted.conversation === 'string' && quoted.conversation) ||
        (typeof (quoted.extendedTextMessage as Record<string, unknown> | undefined)?.text === 'string' &&
          (quoted.extendedTextMessage as Record<string, unknown>).text as string) ||
        null;
      if (quotedText) {
        return `> ${quotedText}\n${ext.text}`;
      }
    }
    return ext.text;
  }

  // Poll creation
  const poll = m.pollCreationMessage as Record<string, unknown> | undefined;
  if (poll && typeof poll.name === 'string') {
    const options = poll.options as Array<{ optionName: string }> | undefined;
    const optionLines = options
      ? options.map((o, i) => `${i + 1}. ${o.optionName}`).join('\n')
      : '';
    return `📊 Poll: ${poll.name}\n${optionLines}`;
  }

  // Location
  const loc = m.locationMessage as Record<string, unknown> | undefined;
  if (loc && typeof loc.degreesLatitude === 'number') {
    return `📍 https://maps.google.com/?q=${loc.degreesLatitude},${loc.degreesLongitude}`;
  }

  // Live location
  const liveLoc = m.liveLocationMessage as Record<string, unknown> | undefined;
  if (liveLoc && typeof liveLoc.degreesLatitude === 'number') {
    return `📍 Live location: https://maps.google.com/?q=${liveLoc.degreesLatitude},${liveLoc.degreesLongitude}`;
  }

  // Image
  const img = m.imageMessage as Record<string, unknown> | undefined;
  if (img) {
    const caption = typeof img.caption === 'string' ? img.caption : null;
    return caption ? `[sent an image: ${caption}]` : '[sent an image]';
  }

  // Video (check GIF first)
  const vid = m.videoMessage as Record<string, unknown> | undefined;
  if (vid) {
    if (vid.gifPlayback) {
      return '[sent a GIF]';
    }
    const caption = typeof vid.caption === 'string' ? vid.caption : null;
    return caption ? `[sent a video: ${caption}]` : '[sent a video]';
  }

  // Audio / voice note
  if (m.audioMessage) {
    return '[sent a voice note]';
  }

  // Sticker
  if (m.stickerMessage) {
    return '[sent a sticker]';
  }

  // Document
  const doc = m.documentMessage as Record<string, unknown> | undefined;
  if (doc) {
    const fileName = typeof doc.fileName === 'string' ? doc.fileName : null;
    return fileName ? `[sent a file: ${fileName}]` : '[sent a file]';
  }

  // Contact
  const contact = m.contactMessage as Record<string, unknown> | undefined;
  if (contact) {
    const name = typeof contact.displayName === 'string' ? contact.displayName : 'Unknown';
    const vcard = typeof contact.vcard === 'string' ? contact.vcard : '';
    const phoneMatch = vcard.match(/TEL[^:]*:([^\n\r]+)/);
    const phone = phoneMatch ? phoneMatch[1].trim() : null;
    return phone ? `[shared contact: ${name}, ${phone}]` : `[shared contact: ${name}]`;
  }

  // Skip: reactions, poll votes, protocol messages (edits, deletes)
  if (m.reactionMessage || m.pollUpdateMessage || m.protocolMessage) {
    return null;
  }

  // Unknown type
  return null;
}
