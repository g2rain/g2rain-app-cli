/** Cryptographically random id generator for DPoP jti / clientId. */
export class Generator {
  private static counter = 0
  private static lastTimestamp = 0

  static random(): string {
    const now = Date.now()
    const randomArray = new Uint32Array(4)
    crypto.getRandomValues(randomArray)

    if (now === this.lastTimestamp) {
      this.counter += 1
    } else {
      this.counter = 0
      this.lastTimestamp = now
    }

    return [
      now.toString(16).padStart(12, '0'),
      this.counter.toString(16).padStart(4, '0'),
      ...Array.from(randomArray, (n) => n.toString(16).padStart(8, '0')),
    ].join('')
  }
}
