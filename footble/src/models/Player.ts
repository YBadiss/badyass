import Club from './Club.ts'

export default class Player {
  id: string
  slug: string
  name: string
  image: string | null
  clubs: Array<Club>

  constructor(id: string, slug: string, name: string, image: string | null, clubs: Array<Club>) {
    this.id = id
    this.slug = slug
    this.name = name
    this.image = image
    this.clubs = clubs
  }

  get imageUrl() {
    return this.image
      ? `https://img.a.transfermarkt.technology/portrait/header/${this.image}`
      : null
  }
}
