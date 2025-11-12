import Club from './Club.ts'

export default class Player {
  id: string
  slug: string
  name: string
  image: string | null
  clubs: Array<Club>
  citizenship: Array<{
    country: string
    alpha2: string
  }>
  position: {
    short_name: string | null
    group: string | null
  }
  date_of_birth: string

  constructor(
    id: string,
    slug: string,
    name: string,
    image: string | null,
    clubs: Array<Club>,
    citizenship: Array<{
      country: string
      alpha2: string
    }>,
    position: {
      short_name: string | null
      group: string | null
    },
    date_of_birth: string
  ) {
    this.id = id
    this.slug = slug
    this.name = name
    this.image = image
    this.clubs = clubs
    this.citizenship = citizenship
    this.position = position
    this.date_of_birth = date_of_birth
  }

  get imageUrl() {
    return this.image
      ? `https://img.a.transfermarkt.technology/portrait/header/${this.image}`
      : null
  }

  get age() {
    return Math.floor(
      (new Date().getTime() - new Date(this.date_of_birth).getTime()) /
        (1000 * 60 * 60 * 24 * 365.25)
    )
  }

  getCitizenshipSimilarity(other: Player): number {
    if (this.citizenship.length === 0) return 0

    // Manually compare to avoid Vue proxy issues with .includes()
    let matches = 0
    for (let i = 0; i < this.citizenship.length; i++) {
      const thisAlpha2 = this.citizenship[i].alpha2
      for (let j = 0; j < other.citizenship.length; j++) {
        const otherAlpha2 = other.citizenship[j].alpha2
        if (thisAlpha2 === otherAlpha2) {
          matches++
          break
        }
      }
    }

    return matches / this.citizenship.length
  }

  getPositionSimilarity(other: Player): number {
    if (this.position.short_name === other.position.short_name) {
      return 1
    }
    if (this.position.group === other.position.group) {
      return 0.5
    }
    return 0
  }

  getAgeSimilarity(other: Player): number {
    return Math.max(0, 1 - Math.abs(this.age - other.age) / 4)
  }

  getClubSimilarity(other: Player): number {
    if (this.clubs.length === 0) return 0

    // Manually compare to avoid Vue proxy issues with .includes()
    let matches = 0
    for (let i = 0; i < this.clubs.length; i++) {
      const thisClub = this.clubs[i]
      for (let j = 0; j < other.clubs.length; j++) {
        const otherClub = other.clubs[j]
        if (thisClub.id === otherClub.id) {
          matches++
          break
        }
      }
    }

    return matches / this.clubs.length
  }

  getOverallSimilarity(other: Player): number {
    const totalSimilarity =
      this.getClubSimilarity(other) +
      this.getPositionSimilarity(other) +
      this.getCitizenshipSimilarity(other) +
      this.getAgeSimilarity(other)
    return totalSimilarity / 4
  }

  getSimilarityColor(similarity: number): string {
    if (similarity >= 1) return 'green'
    if (similarity > 0.4) return 'yellow'
    if (similarity > 0.15) return 'orange'
    return 'red'
  }
}
