import { useState, useCallback } from 'react';
import type { Board, Player, Move } from '../utils/gameLogic';
import {
    createInitialBoard,
    isValidMove,
    applyMove,
    hasValidMoves,
    getScore,
    getFlippableDiscs,
} from '../utils/gameLogic';

export interface GameState {
    board: Board;
    currentPlayer: Player;
    score: { black: number; white: number };
    gameOver: boolean;
    winner: Player | 'draw' | null;
    lastMove: {
        player: Player;
        row: number;
        col: number;
        flipped: Move[];
    } | null;
}

export function useOthello() {
    const [gameState, setGameState] = useState<GameState>({
        board: createInitialBoard(),
        currentPlayer: 'black',
        score: { black: 2, white: 2 },
        gameOver: false,
        winner: null,
        lastMove: null,
    });

    const makeMove = useCallback((row: number, col: number) => {
        setGameState((prev) => {
            if (prev.gameOver) return prev;
            if (!isValidMove(prev.board, prev.currentPlayer, row, col)) return prev;

            const flippable = getFlippableDiscs(prev.board, prev.currentPlayer, row, col);
            const newBoard = applyMove(prev.board, prev.currentPlayer, row, col);
            const newScore = getScore(newBoard);

            let nextPlayer: Player = prev.currentPlayer === 'black' ? 'white' : 'black';

            let gameEndUpdates: Partial<GameState> = {};
            const canNextMove = hasValidMoves(newBoard, nextPlayer);

            if (!canNextMove) {
                const canPrevMove = hasValidMoves(newBoard, prev.currentPlayer);
                if (canPrevMove) {
                    nextPlayer = prev.currentPlayer;
                } else {
                    const winner = newScore.black > newScore.white ? 'black' :
                        newScore.white > newScore.black ? 'white' : 'draw';
                    gameEndUpdates = { gameOver: true, winner };
                }
            }

            return {
                ...prev,
                board: newBoard,
                currentPlayer: nextPlayer,
                score: newScore,
                lastMove: {
                    player: prev.currentPlayer,
                    row,
                    col,
                    flipped: flippable
                },
                ...gameEndUpdates
            };
        });
    }, []);

    const resetGame = useCallback(() => {
        setGameState({
            board: createInitialBoard(),
            currentPlayer: 'black',
            score: { black: 2, white: 2 },
            gameOver: false,
            winner: null,
            lastMove: null,
        });
    }, []);

    return {
        ...gameState,
        makeMove,
        resetGame
    };
}
