import { useState, useCallback } from 'react';
import type { Board, Player, Move, SkillType, FlipProtection } from '../utils/gameLogic';
import {
    BOARD_SIZE,
    createInitialBoard,
    isValidMove,
    applyMove,
    hasValidMoves,
    getScore,
    getFlippableDiscs,
    isCorner
} from '../utils/gameLogic';

export interface BarrierState {
    active: boolean;
    owner: Player;
    appliesTo: Player;
    expiresOnTurn: number;
    cells: boolean[][];
}

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
    skillTiles: Record<string, SkillType>;
    hands: Record<Player, SkillType[]>;
    shield: boolean[][];
    barrier: BarrierState | null;
    logs: string[];
    turnIndex: number;
    turnSkillUsed: boolean;
    doubleMoveRemaining: number;
}

const SKILL_POOL: SkillType[] = [
    'convert',
    'convert',
    'warp',
    'double',
    'shield',
    'barrier',
    'remove',
    'remove'
];
const SKILL_NAMES: Record<SkillType, string> = {
    convert: '変色',
    warp: 'ワープ',
    double: '2回置き',
    shield: 'シールド',
    barrier: 'バリア',
    remove: '除去'
};

const createEmptyBoolGrid = () =>
    Array.from({ length: BOARD_SIZE }, () => Array.from({ length: BOARD_SIZE }, () => false));

const posKey = (row: number, col: number) => `${row},${col}`;

const formatPos = (row: number, col: number) => `(${row + 1},${col + 1})`;

const playerLabel = (player: Player) => (player === 'black' ? 'BLACK' : 'WHITE');

const createRandomSkillTiles = (): Record<string, SkillType> => {
    const positions: { row: number; col: number }[] = [];
    const center = new Set(['3,3', '3,4', '4,3', '4,4']);

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (isCorner(r, c)) continue;
            if (center.has(posKey(r, c))) continue;
            positions.push({ row: r, col: c });
        }
    }

    for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
    }

    const tiles: Record<string, SkillType> = {};
    SKILL_POOL.forEach((skill, index) => {
        const pos = positions[index];
        tiles[posKey(pos.row, pos.col)] = skill;
    });

    return tiles;
};

const buildBarrierCells = (row: number, col: number): boolean[][] => {
    const cells = createEmptyBoolGrid();
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
                cells[r][c] = true;
            }
        }
    }
    return cells;
};

const getFlipProtection = (state: GameState, player: Player, turnIndexOverride?: number): FlipProtection => {
    const turnIndex = turnIndexOverride ?? state.turnIndex;
    const barrierActive = Boolean(
        state.barrier &&
        state.barrier.active &&
        state.barrier.appliesTo === player &&
        state.barrier.expiresOnTurn === turnIndex
    );

    return {
        shield: state.shield,
        barrier: barrierActive
            ? {
                active: true,
                appliesTo: player,
                cells: state.barrier ? state.barrier.cells : createEmptyBoolGrid()
            }
            : null
    };
};

const removeSkillOnce = (hand: SkillType[], skill: SkillType): SkillType[] => {
    const index = hand.indexOf(skill);
    if (index === -1) return hand;
    return [...hand.slice(0, index), ...hand.slice(index + 1)];
};

const isValidSkillTarget = (
    state: GameState,
    skill: SkillType,
    row: number,
    col: number
): boolean => {
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return false;
    const cell = state.board[row][col];
    switch (skill) {
        case 'convert':
            return cell !== null && cell !== state.currentPlayer && !isCorner(row, col);
        case 'warp':
            return cell === null;
        case 'double':
            return false;
        case 'shield':
            return cell === state.currentPlayer && !state.shield[row][col];
        case 'barrier':
            return cell === null;
        case 'remove':
            return cell !== null && !isCorner(row, col);
        default:
            return false;
    }
};

const applySkillTilePickup = (
    state: GameState,
    row: number,
    col: number,
    player: Player
) => {
    const skill = state.skillTiles[posKey(row, col)];
    if (!skill) {
        return { skillTiles: state.skillTiles, hands: state.hands, logs: state.logs };
    }

    const nextSkillTiles = { ...state.skillTiles };
    delete nextSkillTiles[posKey(row, col)];

    const hand = state.hands[player];
    if (hand.length >= 2) {
        const logs = [...state.logs, `${playerLabel(player)} の手札が上限のため ${SKILL_NAMES[skill]} を獲得できなかった ${formatPos(row, col)}`];
        return { skillTiles: nextSkillTiles, hands: state.hands, logs };
    }

    const nextHands = {
        ...state.hands,
        [player]: [...hand, skill]
    };
    const logs = [...state.logs, `${playerLabel(player)} が ${SKILL_NAMES[skill]} を獲得 ${formatPos(row, col)}`];
    return { skillTiles: nextSkillTiles, hands: nextHands, logs };
};

const advanceTurn = (state: GameState): GameState => {
    const nextTurnIndex = state.turnIndex + 1;
    const opponent: Player = state.currentPlayer === 'black' ? 'white' : 'black';
    let nextPlayer: Player = opponent;
    let gameOver = false;
    let winner: Player | 'draw' | null = null;

    const opponentHasMoves = hasValidMoves(
        state.board,
        opponent,
        getFlipProtection(state, opponent, nextTurnIndex)
    );

    if (!opponentHasMoves) {
        const currentHasMoves = hasValidMoves(
            state.board,
            state.currentPlayer,
            getFlipProtection(state, state.currentPlayer, nextTurnIndex)
        );
        if (currentHasMoves) {
            nextPlayer = state.currentPlayer;
        } else {
            gameOver = true;
            winner = state.score.black > state.score.white ? 'black'
                : state.score.white > state.score.black ? 'white' : 'draw';
        }
    }

    let barrier = state.barrier;
    if (barrier && barrier.active && nextTurnIndex > barrier.expiresOnTurn) {
        barrier = { ...barrier, active: false };
    }

    return {
        ...state,
        currentPlayer: nextPlayer,
        turnIndex: nextTurnIndex,
        gameOver,
        winner,
        barrier,
        turnSkillUsed: false,
        doubleMoveRemaining: 0
    };
};

export function useOthello() {
    const [gameState, setGameState] = useState<GameState>({
        board: createInitialBoard(),
        currentPlayer: 'black',
        score: { black: 2, white: 2 },
        gameOver: false,
        winner: null,
        lastMove: null,
        skillTiles: createRandomSkillTiles(),
        hands: { black: [], white: [] },
        shield: createEmptyBoolGrid(),
        barrier: null,
        logs: [],
        turnIndex: 0,
        turnSkillUsed: false,
        doubleMoveRemaining: 0
    });

    const makeMove = useCallback((row: number, col: number) => {
        setGameState((prev) => {
            if (prev.gameOver) return prev;

            const protection = getFlipProtection(prev, prev.currentPlayer, prev.turnIndex);
            if (!isValidMove(prev.board, prev.currentPlayer, row, col, protection)) return prev;

            const flippable = getFlippableDiscs(prev.board, prev.currentPlayer, row, col, protection);
            const newBoard = applyMove(prev.board, prev.currentPlayer, row, col, protection);
            const newScore = getScore(newBoard);

            const pickup = applySkillTilePickup(prev, row, col, prev.currentPlayer);

            const updatedState: GameState = {
                ...prev,
                board: newBoard,
                score: newScore,
                lastMove: {
                    player: prev.currentPlayer,
                    row,
                    col,
                    flipped: flippable
                },
                skillTiles: pickup.skillTiles,
                hands: pickup.hands,
                logs: pickup.logs
            };

            if (prev.doubleMoveRemaining > 0) {
                const remaining = prev.doubleMoveRemaining - 1;
                const stillHasMoves = remaining > 0 && hasValidMoves(
                    newBoard,
                    prev.currentPlayer,
                    getFlipProtection(updatedState, prev.currentPlayer, prev.turnIndex)
                );

                if (remaining > 0 && stillHasMoves) {
                    return {
                        ...updatedState,
                        doubleMoveRemaining: remaining,
                        turnSkillUsed: true
                    };
                }

                return advanceTurn({
                    ...updatedState,
                    doubleMoveRemaining: 0,
                    turnSkillUsed: true
                });
            }

            return advanceTurn(updatedState);
        });
    }, []);

    const applySkill = useCallback((skill: SkillType, target?: { row: number; col: number }) => {
        setGameState((prev) => {
            if (prev.gameOver) return prev;
            if (prev.turnSkillUsed) return prev;
            if (prev.doubleMoveRemaining > 0) return prev;
            if (!prev.hands[prev.currentPlayer].includes(skill)) return prev;

            if (skill === 'double') {
                const protection = getFlipProtection(prev, prev.currentPlayer, prev.turnIndex);
                if (!hasValidMoves(prev.board, prev.currentPlayer, protection)) return prev;
                const nextHands = {
                    ...prev.hands,
                    [prev.currentPlayer]: removeSkillOnce(prev.hands[prev.currentPlayer], skill)
                };
                const logs = [...prev.logs, `${playerLabel(prev.currentPlayer)} が ${SKILL_NAMES[skill]} を使用`];

                return {
                    ...prev,
                    hands: nextHands,
                    logs,
                    turnSkillUsed: true,
                    doubleMoveRemaining: 2,
                    lastMove: null
                };
            }

            if (!target || !isValidSkillTarget(prev, skill, target.row, target.col)) return prev;

            const nextHands = {
                ...prev.hands,
                [prev.currentPlayer]: removeSkillOnce(prev.hands[prev.currentPlayer], skill)
            };
            let nextBoard = prev.board;
            let nextShield = prev.shield;
            let nextBarrier = prev.barrier;
            let nextLogs = [...prev.logs, `${playerLabel(prev.currentPlayer)} が ${SKILL_NAMES[skill]} を使用 ${formatPos(target.row, target.col)}`];
            let lastMove: GameState['lastMove'] = null;

            if (skill === 'convert') {
                const boardCopy = prev.board.map(r => [...r]);
                boardCopy[target.row][target.col] = prev.currentPlayer;
                nextBoard = boardCopy;
                const shieldCopy = prev.shield.map(r => [...r]);
                shieldCopy[target.row][target.col] = false;
                nextShield = shieldCopy;
            }

            if (skill === 'remove') {
                const boardCopy = prev.board.map(r => [...r]);
                boardCopy[target.row][target.col] = null;
                nextBoard = boardCopy;
                const shieldCopy = prev.shield.map(r => [...r]);
                shieldCopy[target.row][target.col] = false;
                nextShield = shieldCopy;
            }

            if (skill === 'warp') {
                const boardCopy = prev.board.map(r => [...r]);
                boardCopy[target.row][target.col] = prev.currentPlayer;
                nextBoard = boardCopy;
                const pickup = applySkillTilePickup(
                    { ...prev, hands: nextHands, skillTiles: prev.skillTiles, logs: nextLogs },
                    target.row,
                    target.col,
                    prev.currentPlayer
                );
                nextLogs = pickup.logs;
                const finalHands = pickup.hands;
                const newSkillTiles = pickup.skillTiles;
                lastMove = {
                    player: prev.currentPlayer,
                    row: target.row,
                    col: target.col,
                    flipped: []
                };
                return advanceTurn({
                    ...prev,
                    board: nextBoard,
                    score: getScore(nextBoard),
                    lastMove,
                    hands: finalHands,
                    skillTiles: newSkillTiles,
                    logs: nextLogs,
                    shield: nextShield,
                    barrier: nextBarrier,
                    turnSkillUsed: true
                });
            }

            if (skill === 'shield') {
                const shieldCopy = prev.shield.map(r => [...r]);
                shieldCopy[target.row][target.col] = true;
                nextShield = shieldCopy;
            }

            if (skill === 'barrier') {
                nextBarrier = {
                    active: true,
                    owner: prev.currentPlayer,
                    appliesTo: prev.currentPlayer === 'black' ? 'white' : 'black',
                    expiresOnTurn: prev.turnIndex + 1,
                    cells: buildBarrierCells(target.row, target.col)
                };
            }

            return advanceTurn({
                ...prev,
                board: nextBoard,
                score: getScore(nextBoard),
                lastMove: lastMove,
                hands: nextHands,
                logs: nextLogs,
                shield: nextShield,
                barrier: nextBarrier,
                turnSkillUsed: true
            });
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
            skillTiles: createRandomSkillTiles(),
            hands: { black: [], white: [] },
            shield: createEmptyBoolGrid(),
            barrier: null,
            logs: [],
            turnIndex: 0,
            turnSkillUsed: false,
            doubleMoveRemaining: 0
        });
    }, []);

    return {
        ...gameState,
        makeMove,
        applySkill,
        resetGame
    };
}
