type Listener<T> = (data: T) => void;

export class EventStream<T> implements AsyncIterable<T> {
  listeners = new Set<Listener<T>>();
  closed = false;

  tx: BroadcastChannel;
  rx: BroadcastChannel;

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return this.iter();
  }

  constructor(name: string) {
    this.tx = new BroadcastChannel(name);
    this.rx = new BroadcastChannel(name);

    // Listen for messages on the receive channel
    this.rx.onmessage = (ev) => {
      this.#broadcast(ev.data);
    };
  }

  #broadcast(data: T) {
    for (const listener of this.listeners) {
      listener(data);
    }
  }

  close(): void {
    this.closed = true;
    this.listeners.clear();
    this.tx.close();
    this.rx.close();
  }

  broadcast(data: T): void {
    if (this.closed) return;
    this.tx.postMessage(data);
  }

  iter(): AsyncIterator<T> {
    return createEventIterator<T>(({ emit }) => this.subscribe(emit));
  }

  once(listener: Listener<T>): () => void {
    const wrapper: Listener<T> = (data) => {
      this.unsubscribe(wrapper);
      listener(data);
    };
    return this.subscribe(wrapper);
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.unsubscribe(listener);
  }

  unsubscribe(listener: Listener<T>): void {
    this.listeners.delete(listener);
  }
}

export type Context<T> = {
  emit: (value: T) => void;
  cancel: () => void;
};

export type CleanupFn = () => void | Promise<void>;

export type Subscriber<T> = (context: Context<T>) => void | CleanupFn | Promise<CleanupFn | void>;

export async function* createEventIterator<T>(subscriber: Subscriber<T>): AsyncGenerator<T> {
  const events: T[] = [];
  let cancelled = false;

  // Create a promise that resolves whenever a new event is added to the events array
  let resolveNext: (() => void) | null = null;

  const emit = (event: T) => {
    events.push(event);
    // If we are awaiting for a new event, resolve the promise
    if (resolveNext) {
      resolveNext();
      resolveNext = null;
    }
  };

  const cancel = () => {
    cancelled = true;
    if (resolveNext) {
      resolveNext();
      resolveNext = null;
    }
  };

  const unsubscribe = await subscriber({ emit, cancel });

  try {
    while (!cancelled) {
      // If there are events in the queue, yield the next event
      if (events.length > 0) {
        yield events.shift()!;
      } else {
        // Wait for the next event
        await new Promise<void>((resolve) => {
          resolveNext = resolve;
        });
      }
    }

    // Process any remaining events that were emitted before cancellation.
    while (events.length > 0) {
      yield events.shift()!;
    }
  } finally {
    await unsubscribe?.();
  }
}
