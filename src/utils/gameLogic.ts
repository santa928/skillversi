export type Player = 'black' | 'white';
export type CellState = Player | null;
export type Board = CellState[][];
export type SkillType = 'convert' | 'warp' | 'double' | 'shield' | 'barrier' | 'remove';

export const BOARD_SIZE = 8;

export interface Move {
    row: number;
    col: number;
}

export interface FlipProtection {
    shield?: boolean[][];
    barrier?: {
        active: boolean;
        appliesTo: Player;
        cells: boolean[][];
    } | null;
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

function inBounds(row: number, col: number): boolean {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function isCorner(row: number, col: number): boolean {
    return (row === 0 || row === BOARD_SIZE - 1) && (col === 0 || col === BOARD_SIZE - 1);
}

export function getFlippableDiscs(
    board: Board,
    player: Player,
    row: number,
    col: number,
    protection?: FlipProtection
): Move[] {
    if (board[row][col] !== null) return [];

    const flippable: Move[] = [];
    const opponent: Player = player === 'black' ? 'white' : 'black';
    const shield = protection?.shield;
    const barrier = protection?.barrier;
    const barrierApplies = Boolean(barrier && barrier.active && barrier.appliesTo === player);
    const isProtected = (r: number, c: number) => {
        if (shield && shield[r] && shield[r][c]) return true;
        if (barrierApplies && barrier?.cells && barrier.cells[r] && barrier.cells[r][c]) return true;
        return false;
    };

    for (const [dr, dc] of DIRECTIONS) {
        let r = row + dr;
        let c = col + dc;
        const temp: Move[] = [];
        let hasOpponent = false;

        // Check direction
        while (inBounds(r, c) && board[r][c] === opponent) {
            hasOpponent = true;
            if (!isProtected(r, c)) {
                temp.push({ row: r, col: c });
            }
            r += dr;
            c += dc;
        }

        // Capture condition met
        if (inBounds(r, c) && board[r][c] === player && hasOpponent && temp.length > 0) {
            flippable.push(...temp);
        }
    }

    return flippable;
}

export function isValidMove(
    board: Board,
    player: Player,
    row: number,
    col: number,
    protection?: FlipProtection
): boolean {
    return getFlippableDiscs(board, player, row, col, protection).length > 0;
}

export function hasValidMoves(board: Board, player: Player, protection?: FlipProtection): boolean {
    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (isValidMove(board, player, r, c, protection)) {
                return true;
            }
        }
    }
    return false;
}

export function applyMove(
    board: Board,
    player: Player,
    row: number,
    col: number,
    protection?: FlipProtection
): Board {
    const flippable = getFlippableDiscs(board, player, row, col, protection);
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
