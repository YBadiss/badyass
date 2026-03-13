export class DebounceBuffer {
  private buffer: string[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private flushing = false;

  constructor(
    private delayMs: number,
    private maxBatch: number,
    private onFlush: (lines: string[]) => void | Promise<void>,
  ) {}

  push(line: string): void {
    this.buffer.push(line);

    if (this.buffer.length >= this.maxBatch) {
      this.flush();
      return;
    }

    this.resetTimer();
  }

  async forceFlush(): Promise<void> {
    this.clearTimer();
    await this.flush();
  }

  destroy(): void {
    this.clearTimer();
    this.buffer = [];
  }

  private resetTimer(): void {
    this.clearTimer();
    this.timer = setTimeout(() => this.flush(), this.delayMs);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || this.flushing) return;
    this.clearTimer();
    this.flushing = true;
    const lines = this.buffer.splice(0);
    try {
      await this.onFlush(lines);
    } finally {
      this.flushing = false;
    }
  }
}
