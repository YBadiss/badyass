export default class Club {
  id: string
  name: string
  playerIds: string[]

  constructor(id: string, name: string, playerIds: string[]) {
    this.id = id
    this.name = name
    this.playerIds = playerIds
  }

  get logoUrl() {
    return getClubLogoUrl(this.id)
  }
}

export function getClubLogoUrl(id: string) {
  return `https://tmssl.akamaized.net//images/wappen/head/${id}.png`
}
