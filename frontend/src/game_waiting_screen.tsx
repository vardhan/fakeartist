import React from 'react';
import {GameState} from './types';
import {gWebsockClient, kMinPlayers} from './globals';

async function startGame(gameId: number, name: string): Promise<void> {
    await gWebsockClient.call('GameServer_startGame', [gameId, name])
}
export function GameWaitingScreen(props: { state: GameState }) {
  let gameState = props.state

  let players = new Array<any>();
  for (let name of Object.keys(gameState.data!.Players)) {
      players.push(
          <li key={name}>
              {name} {name === gameState.name ? <i>(you)</i> : ""}
          </li>)
  }

  let StartGameButton: any = null;
  let onStartGame = async () => {
    await startGame(gameState.gameId, gameState.name);
  }
  if (players.length >= kMinPlayers) {
      StartGameButton = <input type="button" onClick={onStartGame} value="Start Game" />;
  }

  return <div>
      <h2>Game {gameState.gameId}</h2>
      <ul>{players}</ul>
      {StartGameButton}
  </div>
}