import { vi } from 'vitest'

/**
 * Records the elements a fitted list watches, so tests can fire a resize.
 */
export class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []

  observed: Element[] = []

  disconnected = false

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }

  observe(element: Element): void {
    this.observed.push(element)
  }

  unobserve(): void {}

  disconnect(): void {
    this.disconnected = true
    this.observed = []
  }

  /**
   * @param entries Resize records passed to the listener. Tests usually pass none.
   */
  emit(entries: ResizeObserverEntry[] = []): void {
    this.callback(entries, this as unknown as ResizeObserver)
  }
}

vi.stubGlobal('ResizeObserver', FakeResizeObserver)
