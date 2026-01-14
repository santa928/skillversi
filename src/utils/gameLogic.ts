export type Player = 'black' | 'white';
export type CellState = Player | null;
export type Board = CellState[][];

export const BOARD_SIZE = 8;

export interface Move {
    row: number;
    col: number;
}

export function createInitialBoard(): Board {
    const board: Board = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
    // Standard Othello setup
    board[3][3] = 'white';
    board[3][4] = 'black';
    board[4][3] = 'black';
    board[4][4] = 'white';
    return board;
}

const DIRECTIONS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1], [0, 1],
    [1, -1], [1, 0], [1, 1]
];

export function getFlippableDiscs(board: Board, player: Player, row: number, col: number): Move[] {
    if (board[row][col] !== null) return [];

    const flippable: Move[] = [];
    const opponent: Player = player === 'black' ? 'white' : 'black';

    for (const [dr, dc] of DIRECTIONS) {
        let r = row + dr;
        let c = col + dc;
        const temp: Move[] = [];

        // Check direction
        while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === opponent) {
            temp.push({ row: r, col: c });
            r += dr;
            c += dc;
        }

        // Capture condition met
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player && temp.length > 0) {
            flippable.push(...temp);
        }
    }

    return flippable;
}

export function isValidMove(board: Board, player: Player, row: number, col: number): boolean {
    return getFlippableDiscs(board, player, row, col).length > 0;
}

export function hasValidMoves(board: Board, player: Player): boolean {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (isValidMove(board, player, r, c)) {
                return true;
            }
        }
    }
    return false;
}

export function applyMove(board: Board, player: Player, row: number, col: number): Board {
    const flippable = getFlippableDiscs(board, player, row, col);
    if (flippable.length === 0) return board; // Should strictly be checked before calling

    // Deep copy board to treat as immutable
    const newBoard = board.map(r => [...r]);

    // Place piece
    newBoard[row][col] = player;

    // Flip pieces
    for (const { row: r, col: c } of flippable) {
        newBoard[r][c] = player;
    }

    return newBoard;
}

export function getScore(board: Board): { black: number; white: number } {
    let black = 0;
    let white = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (board[r][c] === 'black') black++;
            else if (board[r][c] === 'white') white++;
        }
    }
    return { black, white };
}
