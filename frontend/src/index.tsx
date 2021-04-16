import React, { useState } from 'react';
import ReactDOM from 'react-dom';

import './index.css';
import { NewGameScreen } from './new_game_screen'
import { GameStateScreen } from './game_state_screen'
import { GameWaitingScreen } from './game_waiting_screen'
import { GameVotingScreen } from './game_voting_screen'
import { GameState, GameData, GameStage } from './types'
import { gWebsockClient } from './globals'
import { createMuiTheme, MuiThemeProvider, Step, StepLabel, Stepper } from '@material-ui/core';

function Game(props: {gameId: number, name: string}) {
    let [gameState, setGameState] = useState({
        gameId: props.gameId,
        name: props.name
    } as GameState)

    gWebsockClient.on('GameStateChange', (something: [GameData]) => {
        console.log("GameStateChange",)
        console.log(something)
        if (gameState.gameId === 0) {
            return;
        }
        let gameData = something[0]

        setGameState({
            ...gameState,
            data: gameData
        })
    })

    var screen: any
    let label = ""
    let prevLabel = ""
    if (gameState.gameId === 0) {
        label = "Create or Join Game"
        screen =  <NewGameScreen onGameStateChange={setGameState}></NewGameScreen>
    } else if (gameState.data?.Stage === GameStage.WAITING) {
        prevLabel = "Create or Join Game"
        label = "Waiting for #" + gameState.data!.Id
        screen = <GameWaitingScreen state={gameState}></GameWaitingScreen>
    } else if (gameState.data?.Stage === GameStage.STARTED) {
        prevLabel = "Waiting.."
        label = "Playing #" + gameState.data!.Id
        screen = <GameStateScreen state={gameState}></GameStateScreen>
    } else if (gameState.data?.Stage === GameStage.VOTING || GameStage.OVER) {
        prevLabel = "Playing.."
        label = "Voting #" + gameState.data!.Id
        screen = <GameVotingScreen state={gameState}></GameVotingScreen>
    }

    return <div style={{justifyContent: "center"}}>
        <Stepper alternativeLabel activeStep={1} style={{width: "50%", justifyContent: "center"}}>
            {prevLabel.length > 0 ? <Step key={0}><StepLabel>{prevLabel}</StepLabel></Step> : null}
            <Step key={1}>
                <StepLabel>{label}</StepLabel>
            </Step>
        </Stepper>
        <p>
            {screen}
        </p>
    </div>
}

const theme = createMuiTheme({
    palette: {
      type: 'dark',
    },
  });
  
ReactDOM.render(
    <React.StrictMode>
        <MuiThemeProvider theme={theme}>
        <Game gameId={0} name=""></Game>
        </MuiThemeProvider>
    </React.StrictMode>,
    document.getElementById('root')
);