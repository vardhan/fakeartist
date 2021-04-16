import React, { useState } from 'react';
import { GameState, GameData, OnGameStateChange } from './types';
import { gWebsockClient } from './globals'
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import { Card, CardContent, Divider, Step, StepContent, StepLabel, Stepper } from '@material-ui/core';
import { createOptimisticUniqueName } from 'typescript';

async function newGame(name: string): Promise<GameState> {
    let data: GameData = await gWebsockClient.call('GameServer_newGame', [name])
    return { gameId: data.Id, name: name, data: data }
}
async function joinGame(gameId: number, name: string): Promise<GameState> {
    let gameData = await gWebsockClient.call('GameServer_joinGame', [gameId, name])
    return {
        gameId: gameId,
        name: name,
        data: gameData
    }
}

export function NewGameScreen(props: { onGameStateChange: OnGameStateChange }) {
    console.log('inside new game screen')
    let [name, setName] = useState('')
    let onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setName(e.target.value)
    }

    let [gameId, setGameId] = useState(0)
    let onGameIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setGameId(Number(e.target.value))
    }

    let onNewGame = async () => {
        props.onGameStateChange(await newGame(name))
    };

    let onJoinGame = async () => {
        try {
            props.onGameStateChange(await joinGame(gameId, name))
        } catch (err) {
            console.log("could not join game: " + err.message)
        }
    };

    let activeStep = 0
    return <Card>
        <CardContent>
            <TextField label="Player Name" onChange={onNameChange} />
            <Divider variant="middle" />
            <Button onClick={onNewGame}>Create New Game</Button>
            <Divider variant="middle" />
            <TextField label="Game ID" value={gameId} onChange={onGameIdChange} />
            <Button onClick={onJoinGame}>Join Game</Button>
        </CardContent>
    </Card>;
}