import Club from './models/Club.ts'
import Player from './models/Player.ts'
import Storage from './storage.ts'

export default class GameState {
  public allPlayers: Player[]
  public topPlayers: Player[]
  public player: Player | null
  public guessedPlayers: Player[]
  public storage: Storage
  public maxGuesses: number
  public customPlayerId: string | null

  constructor(storage: Storage, maxGuesses: number) {
    this.allPlayers = []
    this.topPlayers = []
    this.player = null
    this.guessedPlayers = []
    this.storage = storage
    this.maxGuesses = maxGuesses
    this.customPlayerId = null
  }

  async init(playerId?: string) {
    this.allPlayers = await fetchPlayers('./players.json')
    this.topPlayers = await fetchPlayers('./top_players.json')

    if (playerId) {
      // Load specific player by ID
      this.customPlayerId = playerId
      const foundPlayer = this.allPlayers.find(p => p.id === playerId)
      this.player = foundPlayer || this.topPlayers[this.dayIndex % this.topPlayers.length]
    } else {
      // Load daily player
      this.player = this.topPlayers[this.dayIndex % this.topPlayers.length]
    }

    this.loadGuessesFromStorage()
  }

  public addGuess(player: Player): void {
    if (this.isGameOver) return
    if (this.guessedPlayers.some((p: Player) => p.id === player.id)) return

    this.guessedPlayers.push(player)
  }

  public get isGameWon(): boolean {
    return this.guessedPlayers.some((p: Player) => p.id === this.player?.id)
  }

  public get isGameOver(): boolean {
    return this.isGameWon || this.guessedPlayers.length >= this.maxGuesses
  }

  public saveToStorage(): void {
    this.saveGuessesToStorage()
  }

  private get dayIndex(): number {
    return Math.floor(
      (new Date().getTime() - new Date('2000-01-01').getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  private get storageKey(): string {
    if (this.customPlayerId) {
      return `custom-${this.customPlayerId}`
    }
    return this.dayIndex.toString()
  }

  private loadGuessesFromStorage(): void {
    const guesses = this.storage.retrieve(`${this.storageKey}/guesses`)
    const guessIds: string[] = guesses ? JSON.parse(guesses) : []

    this.guessedPlayers = guessIds
      .map((id: string) => this.allPlayers.find((p: Player) => p.id === id))
      .filter((p: Player | undefined): p is Player => p !== undefined)
  }

  private saveGuessesToStorage(): void {
    const guessIds = this.guessedPlayers.map((p: Player) => p.id)
    this.storage.store(`${this.storageKey}/guesses`, JSON.stringify(guessIds))
  }
}

interface PlayerData {
  id: string
  slug: string
  name: string
  image: string
  club_ids: string[]
  citizenship: string[]
  position: {
    short_name: string | null
    group: string | null
  }
  date_of_birth: string
}

const fetchPlayers = async (filepath: string): Promise<Player[]> => {
  const playersResponse = await fetch(filepath)
  return (await playersResponse.json()).map(
    (player: PlayerData) =>
      new Player(
        player.id,
        player.slug,
        cleanPlayerName(player.name),
        player.image,
        player.club_ids.map((clubId: string) => new Club(clubId)),
        player.citizenship || [],
        player.position || { short_name: null, group: null },
        player.date_of_birth || ''
      )
  )
}

const cleanPlayerName = (name: string): string => {
  return (
    name
      // Remove accents by decomposing and removing diacritical marks
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      // Remove non-ASCII characters
      .replace(/[^\x20-\x7F]/g, '')
      // Clean up any extra spaces
      .replace(/\s+/g, ' ')
      .trim()
  )
}
