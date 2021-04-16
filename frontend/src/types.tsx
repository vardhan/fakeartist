export interface GameState {
    gameId: number
    name: string
    data?: GameData
}
export interface PlayerData {
    Name: string
    Color: string
    Votes: number // number of votes against this player
    VotedAgainst: string // player name. empty means not yet voted
}
export interface GameData {
    Id: number
    Stage: GameStage
    Player0: string
    Players: PlayerToData // string -> PlayerData
    TurnOrder: Array<string>
    TurnOrderRound: number
    Strokes: Array<Array<Coord>>
}
export interface PlayerToData {
    [key: string]: PlayerData
}

export enum GameStage {
    WAITING = 0,
    STARTED = 1,
    VOTING = 2,
    OVER = 3
}

export interface Coord {
    X: number,
    Y: number
}

export type OnGameStateChange = (state: GameState) => void