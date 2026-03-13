export function formatLine(sender: string, content: string): string {
  const cleaned = content.trim().replace(/\n{3,}/g, '\n\n');
  return `[${sender}]: ${cleaned}`;
}

export function stripQuotedReply(body: string): string {
  const patterns = [
    /^On .+ wrote:\s*$/m,           // Gmail: "On Mon, Jan 1, 2024 ... wrote:"
    /^_{10,}\s*$/m,                  // Outlook: line of underscores
    /^>.*$/m,                        // Quoted lines starting with >
    /^From:\s/m,                     // Generic: "From: ..."
    /^-{2,}\s*Original Message/im,   // "-- Original Message" variants
  ];

  let result = body;
  for (const pattern of patterns) {
    const match = result.search(pattern);
    if (match !== -1) {
      result = result.substring(0, match);
    }
  }

  result = result.trim();
  return result || '[empty reply]';
}
