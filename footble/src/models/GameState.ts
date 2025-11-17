import Club from './Club.ts'
import Player from './Player.ts'
import Storage from './Storage.ts'
import { rand } from '../random.ts'

export default class GameState {
  public topPlayers: Player[]
  public allPlayers: Player[]
  public clubs: Club[]
  public player: Player | null
  public guessedPlayers: Player[]
  public storage: Storage
  public maxGuesses: number
  public customClub: Club | null

  constructor(storage: Storage, maxGuesses: number) {
    this.topPlayers = []
    this.allPlayers = []
    this.clubs = []
    this.player = null
    this.guessedPlayers = []
    this.allPlayers = []
    this.storage = storage
    this.maxGuesses = maxGuesses
    this.customClub = null
  }

  async init(playerId?: string, clubId?: string) {
    try {
      this.allPlayers = await fetchPlayers('./players.json')
      this.topPlayers = await fetchPlayers('./top_players.json')
      this.clubs = await fetchClubs('./clubs.json')

      if (playerId) {
        // Load specific player by ID
        this.player = this.allPlayers.find(p => p.id === playerId) || null
        if (!this.player) {
          console.warn(`Player with ID ${playerId} not found`)
        }
      } else if (clubId) {
        this.customClub = this.clubs.find(c => c.id === clubId) || null
        if (this.customClub) {
          console.log(this.customClub)
          const playerId =
            this.customClub.playerIds[
              Math.floor(this.randomNumber * this.customClub.playerIds.length)
            ]
          this.player = this.allPlayers.find(p => p.id === playerId) || null
          if (!this.player) {
            console.warn(`Player with ID ${playerId} not found`)
          }
        }
      } else {
        // By default, load daily player
        this.player = this.topPlayers[Math.floor(this.randomNumber * this.topPlayers.length)]
      }

      console.log(this.player)

      this.loadGuessesFromStorage()
    } catch (error) {
      console.error('Failed to initialize game state:', error)
      throw error
    }
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

  public get dayNumber(): number {
    return Math.floor(
      (new Date().getTime() - new Date('2000-01-01').getTime()) / (1000 * 60 * 60 * 24)
    )
  }

  private get randomNumber(): number {
    return rand(this.dayNumber)
  }

  private get storageKey(): string {
    if (this.player) {
      return `player-${this.player.id}`
    } else {
      return ''
    }
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
  citizenship: {
    country: string
    alpha2: string
  }[]
  position: {
    short_name: string | null
    group: string | null
  }
  date_of_birth: string
}

const fetchPlayers = async (filepath: string): Promise<Player[]> => {
  try {
    const playersResponse = await fetch(filepath)
    if (!playersResponse.ok) {
      throw new Error(
        `Failed to fetch players: ${playersResponse.status} ${playersResponse.statusText}`
      )
    }
    const data = await playersResponse.json()
    return data.map((player: PlayerData) => {
      return new Player(
        player.id,
        player.slug,
        cleanPlayerName(player.name),
        player.image,
        player.club_ids,
        player.citizenship,
        player.position || { short_name: null, group: null },
        player.date_of_birth || ''
      )
    })
  } catch (error) {
    console.error(`Error fetching players from ${filepath}:`, error)
    throw error
  }
}

interface ClubData {
  id: string
  name: string
  players: string[]
}

const fetchClubs = async (filepath: string): Promise<Club[]> => {
  try {
    const clubResponse = await fetch(filepath)
    if (!clubResponse.ok) {
      throw new Error(`Failed to fetch clubs: ${clubResponse.status} ${clubResponse.statusText}`)
    }
    const data = await clubResponse.json()
    return data.map((club: ClubData) => new Club(club.id, club.name, club.players))
  } catch (error) {
    console.error(`Error fetching clubs from ${filepath}:`, error)
    throw error
  }
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
