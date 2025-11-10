export default class Club {
  id: string

  constructor(id: string) {
    this.id = id
  }

  get logoUrl() {
    return `https://tmssl.akamaized.net//images/wappen/head/${this.id}.png`
  }
}
