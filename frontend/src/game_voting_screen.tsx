import React, { useRef } from 'react';
import {GameStage, GameState, OnGameStateChange} from './types';
import {DrawPad} from './game_state_screen'
import {gWebsockClient, kMinPlayers} from './globals';

async function voteAgainst(gameId: number, name: string, against: string): Promise<void> {
    await gWebsockClient.call('GameServer_voteAgainst', [gameId, name, against])
}
export function GameVotingScreen(props: { state: GameState }) {
  let gameState = props.state
  let data = gameState.data!
  let selfData = data.Players[gameState.name]
  let votes = new Array<any>()
  for (let player of data.TurnOrder) {
    let pdata = data.Players[player]
    let playerVotes = pdata.Votes
    let displayStyle = {
        color: pdata.Color
      }
    let display = <option disabled={player == selfData.Name}>
        {player} ({playerVotes}) {selfData.VotedAgainst == player ? "X" : null}
    </option>
    votes.push(display)
  }

  let selectRef = useRef<HTMLSelectElement>(null);
  let vote = async() => {
    let selectedPlayer = data.TurnOrder[selectRef.current!.selectedIndex]
    await voteAgainst(gameState.gameId, gameState.name, selectedPlayer)
  }

  return <div>
      <h2>Game {gameState.gameId}</h2>
      <DrawPad state={gameState}></DrawPad>
      <div>
        <select ref={selectRef}>{votes}</select>
        <button onClick={vote} disabled={selfData.VotedAgainst.length > 0}>Vote</button>
      </div>
      {gameState.data!.Stage == GameStage.OVER ? <p><b>GAME OVER!</b></p> : null}
  </div>
}