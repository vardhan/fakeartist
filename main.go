package main

import (
	"io/fs"
	"log"
	"net/http"

	"embed"

	"github.com/ethereum/go-ethereum/rpc"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

//go:embed frontend/build/*
var PublicFs embed.FS

func main() {
	gameServer := MakeGameServer()
	server := rpc.NewServer()
	err := server.RegisterName("GameServer", gameServer)
	if err != nil {
		log.Fatalln(err)
	}

	staticFs, err := fs.Sub(PublicFs, "frontend/build")
	if err != nil {
		log.Fatalln("frontend/build is missing")
	}

	router := mux.NewRouter()
	// TODO: dont allow * origin, here and below.
	router.Handle("/ws", server.WebsocketHandler([]string{"*"}))
	router.PathPrefix("/").Handler(http.FileServer(http.FS(staticFs)))
	http.ListenAndServe(":1234", cors.Default().Handler(router))
}
