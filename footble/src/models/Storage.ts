export default class Storage {
  private key: string

  constructor(key: string) {
    this.key = key
  }

  store(subKey: string, value: string) {
    localStorage.setItem(`${this.key}/${subKey}`, value)
  }

  retrieve(subKey: string) {
    return localStorage.getItem(`${this.key}/${subKey}`)
  }
}
