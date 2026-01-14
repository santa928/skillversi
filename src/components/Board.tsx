import React from 'react';
import { Board as BoardType, Player, isValidMove } from '../utils/gameLogic';
import { Disc } from './Disc';
import './Board.css';

interface BoardProps {
    board: BoardType;
    currentPlayer: Player;
    onMove: (row: number, col: number) => void;
    gameOver: boolean;
}

export const Board: React.FC<BoardProps> = ({ board, currentPlayer, onMove, gameOver }) => {
    return (
        <div className="board-wrapper">
            <div className="board">
                {board.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                        const isValid = !gameOver && isValidMove(board, currentPlayer, rowIndex, colIndex);

                        return (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                className={`cell ${isValid ? 'valid-move' : ''}`}
                                onClick={() => isValid && onMove(rowIndex, colIndex)}
                            >
                                {cell && <Disc color={cell} />}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
