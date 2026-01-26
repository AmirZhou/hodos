export interface StreamChunk {
  index: number;
  text: string;
  isFinal?: boolean;
}

export interface StreamingTextAccumulatorOptions {
  onUpdate?: (text: string) => void;
  onComplete?: (text: string) => void;
}

export class StreamingTextAccumulator {
  private chunks: Map<number, string> = new Map();
  private finalIndex: number | null = null;
  private options: StreamingTextAccumulatorOptions;

  constructor(options: StreamingTextAccumulatorOptions = {}) {
    this.options = options;
  }

  addChunk(chunk: StreamChunk): void {
    this.chunks.set(chunk.index, chunk.text);

    if (chunk.isFinal) {
      this.finalIndex = chunk.index;
    }

    const text = this.getText();
    this.options.onUpdate?.(text);

    if (this.isComplete()) {
      this.options.onComplete?.(text);
    }
  }

  getText(): string {
    if (this.chunks.size === 0) return "";

    const indices = Array.from(this.chunks.keys()).sort((a, b) => a - b);
    return indices.map((i) => this.chunks.get(i)).join("");
  }

  isComplete(): boolean {
    return this.finalIndex !== null;
  }
}
