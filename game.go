package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"math/rand"

	"github.com/ethereum/go-ethereum/rpc"
)

var kColors = []string{"darkgreen", "darkblue", "maroon", "red", "gold", "chartreuse", "aqua", "fuchsia", "cornflower", "peachpuff"}

type GameServer struct {
	games map[GameID]*Game
}

type GameID = int
type PlayerName = string

type GameStage int

const (
	GameStage_WAITING GameStage = iota
	GameStage_STARTED
	GameStage_VOTING
	GameStage_OVER
)

type Coord struct {
	X int
	Y int
}
type Game struct {
	Id int
	// GameStage_WAITING == game was created, and players can join
	// GameStage_STARTED == in play. new players cannot join.
	Stage GameStage
	// who started this game?
	Player0 PlayerName
	// player -> player state
	Players map[PlayerName]*Player
	// Turn order
	// Initialized when Stage -> GameStage_STARTED
	TurnOrder []PlayerName
	// Who's turn is it currently
	// Only applicable when Stage = GameStage_STARTED
	TurnOrderRound int
	Strokes        [][]Coord

	playerClients map[PlayerName][]*rpc.Client
}
type Player struct {
	Name         string
	Color        string
	Votes        int
	VotedAgainst string
}

func MakeGameServer() *GameServer {
	return &GameServer{
		games: make(map[GameID]*Game),
	}
}

func (g *GameServer) makeGameId() GameID {
	var newId = 0
	for {
		newId = rand.Intn(10000)
		_, exists := g.games[newId]
		if !exists {
			break
		}
	}
	return newId
}

func (g *GameServer) NewGame(ctx context.Context, playerName string) Game {
	newId := g.makeGameId()
	players := map[PlayerName]*Player{
		playerName: {
			Name:         playerName,
			Color:        kColors[0],
			Votes:        0,
			VotedAgainst: "",
		},
	}
	game := &Game{
		Id:             newId,
		Stage:          GameStage_WAITING,
		Player0:        playerName,
		Players:        players,
		TurnOrder:      []string{playerName},
		TurnOrderRound: 0,
		Strokes:        [][]Coord{},
		playerClients:  map[string][]*rpc.Client{},
	}
	g.games[newId] = game
	g.saveClient(ctx, newId, playerName)

	log.Printf("New Game: %v", game)
	return *game
}

func (g *GameServer) JoinGame(ctx context.Context, gameId GameID, playerName string) (*Game, error) {
	game, exists := g.games[gameId]
	if !exists {
		return nil, errors.New("no such game ID")
	}

	if _, exists := game.Players[playerName]; !exists {
		if game.Stage != GameStage_WAITING {
			return nil, errors.New("new players can only join at the Waiting stage of the game")
		}

		player := &Player{
			Name:  playerName,
			Color: kColors[len(game.Players)],
		}
		game.Players[playerName] = player
		game.TurnOrder = append(game.TurnOrder, playerName)

		log.Printf("Join Game: %s joined %v", playerName, game)
	}

	g.saveClient(ctx, gameId, playerName)
	g.broadcastState(ctx, gameId)
	return game, nil
}

func (g *GameServer) saveClient(ctx context.Context, gameId GameID, playerName string) {
	// save the Client for broadcasts.
	client, supported := rpc.ClientFromContext(ctx)
	if !supported {
		log.Printf("error: could not save client for gameid=%d, playerName=%s", gameId, playerName)
		return
	}
	game := g.games[gameId]
	game.playerClients[playerName] = append(game.playerClients[playerName], client)
}

func (g *GameServer) StartGame(ctx context.Context, gameId GameID, playerName string) error {
	game, exists := g.games[gameId]
	if !exists {
		return errors.New("no such game ID")
	}
	if _, exists := game.Players[playerName]; !exists {
		return errors.New("unknown playerName")
	}
	if game.Player0 != playerName {
		return fmt.Errorf("player '%s' does not run this game", playerName)
	}
	if game.Stage != GameStage_WAITING {
		return errors.New("game has already started")
	}

	rand.Shuffle(len(game.TurnOrder), func(i int, j int) {
		game.TurnOrder[i], game.TurnOrder[j] = game.TurnOrder[j], game.TurnOrder[i]
	})
	game.TurnOrderRound = 0
	game.Stage = GameStage_STARTED

	log.Printf("Start Game %d: %v", gameId, game)
	g.broadcastState(ctx, gameId)
	return nil
}

func (g *GameServer) broadcastState(ctx context.Context, gameId GameID) {
	game := g.games[gameId]
	log.Printf("Notify state change for gameId=%d", gameId)

	for playerName := range game.playerClients {
		clients := game.playerClients[playerName]
		for _, client := range clients {
			client.Notify(ctx, "GameStateChange", *game)
		}
	}
}

func (g *GameServer) DrawStroke(ctx context.Context, gameId GameID, playerName string, stroke []Coord) error {
	game, exists := g.games[gameId]
	if !exists {
		return errors.New("no such game ID")
	}
	if _, exists := game.Players[playerName]; !exists {
		return errors.New("unknown playerName")
	}
	if game.Stage != GameStage_STARTED {
		return errors.New("game has not started yet")
	}
	numPlayers := len(game.Players)
	curPlayer := game.TurnOrder[game.TurnOrderRound%numPlayers]
	if curPlayer != playerName {
		return fmt.Errorf("it is not %s's turn yet", playerName)
	}

	game.Strokes = append(game.Strokes, stroke)
	game.TurnOrderRound += 1
	if game.TurnOrderRound == len(game.Players)*2 {
		game.Stage = GameStage_VOTING
	}
	g.broadcastState(ctx, gameId)
	return nil
}

func (g *GameServer) VoteAgainst(ctx context.Context, gameId GameID, playerName string, against string) error {
	game, exists := g.games[gameId]
	if !exists {
		return errors.New("no such game ID")
	}
	player, exists := game.Players[playerName]
	if !exists {
		return errors.New("unknown playerName")
	}
	if game.Stage != GameStage_VOTING {
		return errors.New("game is not voting yet")
	}
	if _, exists := game.Players[against]; !exists {
		return errors.New("unknown against")
	}
	if len(player.VotedAgainst) > 0 {
		return errors.New("you have already voted")
	}

	log.Printf("Vote Against %d: %s voted against %s", gameId, playerName, against)
	player.VotedAgainst = against
	game.Players[against].Votes += 1

	// did everyone vote?
	totalVotes := 0
	for player := range game.Players {
		pdata := game.Players[player]
		totalVotes += pdata.Votes
	}
	if totalVotes == len(game.Players) {
		log.Printf("Game Over %d", gameId)
		game.Stage = GameStage_OVER
	}

	g.broadcastState(ctx, gameId)
	return nil
}
