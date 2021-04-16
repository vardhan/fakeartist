import React, { useEffect, useRef } from 'react';
import {GameState, GameStage, PlayerData, Coord} from './types';
import {gWebsockClient} from './globals';

export function GameStateScreen(props: {state: GameState}) {
  let state = props.state
  let data = props.state.data!
  let players: PlayerData[] = Object.values(props.state.data!.Players)
  let curTurnPlayer = data.TurnOrder[data.TurnOrderRound % players.length]

  let playersListView = [];
  for (let player of players) {


    let you = null
    if (player.Name === state.name) {
      you = <i>(you)</i>
    }
    let displayStyle = {
      color: player.Color
    }
    let display = <span style={displayStyle}>{player.Name} {you}</span>
    if (player.Name === curTurnPlayer) {
      display = <b>{display}</b>
    }
    playersListView.push(
      <li key={player.Name}>
        {display}
      </li>)
  }

  return <div>
      <h2>Game {state.gameId}</h2>
      <ul>{playersListView}</ul>
      <DrawPad state={state}></DrawPad>
    </div>;
}

export function DrawPad(props: { state: GameState }) {
  let canvasRef = useRef<HTMLCanvasElement>(null)
  let [stroke, setStroke] = React.useState<Array<Coord>>([])
  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }
    renderDrawPad(canvasRef.current, props.state, stroke, setStroke)
  }, [props.state, stroke, setStroke]);

  let canvasStyle = {border: "2px solid black"}
  return <React.Fragment>
    <canvas ref={canvasRef} width='400' height='400' style={canvasStyle}></canvas>
    <br />
    <input
      type='button'
      value='Finish Drawing'
      disabled={stroke.length === 0 ? true : false}
      onClick={() => drawStroke(props.state.gameId, props.state.name, stroke)}></input>
  </React.Fragment>
}

function getCurrentTurnPlayer(state: GameState): string {
  let numPlayers = Object.entries(state.data!.Players).length;
  return state.data!.TurnOrder[state.data!.TurnOrderRound % numPlayers]
}
function renderDrawPad(canvas: HTMLCanvasElement, state: GameState, stroke: Array<Coord>, setStroke: (stroke: Array<Coord>) => void) {
  let ctx = canvas.getContext('2d')!
  let drawing = false;
  console.log(state.data!.Players[state.name])
  let player = state.data!.Players[state.name]
  let selfColor = player!.Color

  let onmousedown = (event: MouseEvent) => {
    if (player.Name != getCurrentTurnPlayer(state)) {
      return;
    }
    drawing = true
    let [x,y] = [event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop]
    stroke = [{X: x, Y: y}]
    renderStrokes(ctx, stroke, state)
  }
  let onmousemove = (event: MouseEvent) => {
    if (!drawing) {
      return;
    }
    let [x,y] = [event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop]
    let [prevX, prevY] = [stroke[stroke.length-1].X, stroke[stroke.length-1].Y]
    if (x === prevX && y === prevY) {
      return;
    }
    stroke.push({X: x, Y: y})
    renderStroke(ctx, stroke, selfColor) // only render the drawing stroke, not every stroke
  }
  let onmouseup =  async (event: MouseEvent) => {
    drawing = false
    setStroke(stroke)
  }
  let onmouseleave = async (event: MouseEvent) => {
    if (!drawing) {
      return;
    }
    drawing = false
    setStroke(stroke)
  }
  if (state.data!.Stage == GameStage.STARTED) {
    canvas.addEventListener('mousedown', onmousedown)
    canvas.addEventListener('mousemove', onmousemove)
    canvas.addEventListener('mouseup', onmouseup)
    canvas.addEventListener('mouseleave', onmouseleave)
  } else {
    canvas.removeEventListener('mousedown', onmousedown)
    canvas.removeEventListener('mousemove', onmousemove)
    canvas.removeEventListener('mouseup', onmouseup)
    canvas.removeEventListener('mouseleave', onmouseleave)
  }

  renderStrokes(ctx, stroke, state);
}

function renderStrokes(ctx: CanvasRenderingContext2D, stroke: Array<Coord>, state: GameState) {
  let selfPlayer = state.data!.Players[state.name]
  let selfColor = selfPlayer!.Color
  let numPlayers: number = Object.entries(state.data!.Players).length
  ctx.clearRect(0, 0, 400, 400)
  if (stroke.length > 0) {
    renderStroke(ctx, stroke, selfColor)
  }
  for (let i in state.data!.Strokes) {
    let stroke = state.data!.Strokes[i]
    let player = state.data!.TurnOrder[Number(i) % numPlayers]
    let color = state.data!.Players[player]!.Color
    // Player color
    renderStroke(ctx, stroke, color)
  }
}

function renderStroke(ctx: CanvasRenderingContext2D, strokes: Array<Coord>, color: string) {
  ctx.strokeStyle = color
  ctx.lineWidth = 3;
  ctx.beginPath()
  ctx.moveTo(strokes[0].X, strokes[0].Y)
  for (var i = 1; i < strokes.length; i++) {
    ctx.lineTo(strokes[i].X, strokes[i].Y)
  }
  ctx.stroke()
}

async function drawStroke(gameId: number, name: string, stroke: Array<Coord>): Promise<void> {
  await gWebsockClient.call('GameServer_drawStroke', [gameId, name, stroke])
}