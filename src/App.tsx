import { useCallback, useEffect, useRef, useState } from 'react';
import { useOthello } from './hooks/useOthello';
import { VFXLayer } from './components/VFXLayer';
import { BOARD_SIZE, applyMove, getFlippableDiscs, getScore, hasValidMoves, isCorner, isValidMove } from './utils/gameLogic';
import type { Board, Player, SkillType } from './utils/gameLogic';
import './index.css';

const SKILL_NAMES: Record<SkillType, string> = {
  convert: '変色',
  warp: 'ワープ',
  double: '2回置き',
  shield: 'シールド',
  block: 'ブロック',
  remove: '除去'
};

const SKILL_SHORT: Record<SkillType, string> = {
  convert: 'CV',
  warp: 'WP',
  double: '2X',
  shield: 'SH',
  block: 'BL',
  remove: 'RM'
};

const SKILL_REQUIRES_TARGET: Record<SkillType, boolean> = {
  convert: true,
  warp: true,
  double: false,
  shield: true,
  block: true,
  remove: true
};

const SKILL_DESCRIPTIONS: Record<SkillType, string> = {
  convert: '相手のコマ1つを自分色に変更（角は不可）',
  warp: '空きマスに自分のコマを置く（通常反転なし）',
  double: 'このターンに最大2回置ける（合法手がある場合のみ）',
  shield: '自分のコマ1つをひっくり返し無効化（角は不可）',
  block: '空きマスを指定し、そのマスに相手は通常手で置けなくなる（角は不可）',
  remove: '盤面のコマ1つを取り除く（角は不可）'
};

function App() {
  const {
    board,
    currentPlayer,
    score,
    gameOver,
    winner,
    makeMove,
    applySkill,
    passTurn,
    resetGame,
    lastMove,
    skillTiles,
    hands,
    shield,
    block,
    logs,
    turnSkillUsed,
    doubleMoveRemaining
  } = useOthello();

  const [pendingSkill, setPendingSkill] = useState<SkillType | null>(null);
  const [pendingTarget, setPendingTarget] = useState<{ row: number; col: number } | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [mode, setMode] = useState<'pvp' | 'cpu'>('pvp');
  const [cpuPlayer, setCpuPlayer] = useState<Player>('white');
  const [cpuLevel, setCpuLevel] = useState<'easy' | 'normal' | 'hard'>('normal');
  const cpuTimerRef = useRef<number | null>(null);
  const cpuBusyRef = useRef(false);

  const getProtectionFor = useCallback((player: Player) => {
    return {
      shield,
      block: block[player]
    };
  }, [block, shield]);

  const flipProtection = getProtectionFor(currentPlayer);

  const isValidSkillTarget = (skill: SkillType, row: number, col: number) => {
    const cell = board[row][col];
    const isBlocked = block.black[row][col] || block.white[row][col];
    switch (skill) {
      case 'convert':
        return cell !== null && cell !== currentPlayer && !isCorner(row, col);
      case 'warp':
        return cell === null;
      case 'double':
        return false;
      case 'shield':
        return cell === currentPlayer && !shield[row][col] && !isCorner(row, col);
      case 'block':
        return cell === null && !isCorner(row, col) && !isBlocked;
      case 'remove':
        return cell !== null && !isCorner(row, col);
      default:
        return false;
    }
  };

  const hasTargetForSkill = (skill: SkillType) => {
    if (skill === 'double') {
      return hasValidMoves(board, currentPlayer, flipProtection);
    }
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board[r].length; c++) {
        if (isValidSkillTarget(skill, r, c)) return true;
      }
    }
    return false;
  };

  const canUseSkill = (skill: SkillType) => {
    if (gameOver) return false;
    if (doubleMoveRemaining > 0) return false;
    if (turnSkillUsed) return false;
    if (pendingSkill && pendingSkill !== skill) return false;
    if (!hands[currentPlayer].includes(skill)) return false;
    return hasTargetForSkill(skill);
  };

  const isCpuTurn = mode === 'cpu' && currentPlayer === cpuPlayer;

  const handleSkillClick = (skill: SkillType) => {
    if (isCpuTurn) return;
    if (!canUseSkill(skill)) return;
    if (skill === 'double') {
      applySkill(skill);
      return;
    }
    if (pendingSkill === skill) {
      setPendingSkill(null);
      setPendingTarget(null);
      return;
    }
    setPendingSkill(skill);
    setPendingTarget(null);
  };

  const handleCellClick = (row: number, col: number) => {
    if (isCpuTurn) return;
    if (pendingSkill && SKILL_REQUIRES_TARGET[pendingSkill]) {
      if (isValidSkillTarget(pendingSkill, row, col)) {
        if (pendingTarget && pendingTarget.row === row && pendingTarget.col === col) {
          setPendingTarget(null);
        } else {
          setPendingTarget({ row, col });
        }
      }
      return;
    }
    makeMove(row, col);
    setPendingSkill(null);
    setPendingTarget(null);
  };

  const confirmSkill = () => {
    if (isCpuTurn) return;
    if (!pendingSkill || !pendingTarget) return;
    applySkill(pendingSkill, pendingTarget);
    setPendingSkill(null);
    setPendingTarget(null);
  };

  const cancelSkill = () => {
    if (isCpuTurn) return;
    setPendingSkill(null);
    setPendingTarget(null);
  };

  const renderHand = (player: 'black' | 'white') => {
    const isActive = player === currentPlayer;
    const hand = hands[player];
    const isCpuHand = mode === 'cpu' && player === cpuPlayer;

    return (
      <div className={`skill-panel ${isActive ? 'active' : ''} ${isCpuHand ? 'cpu-hand' : ''}`}>
        <div className="skill-panel-header">
          <span>
            {player === 'black' ? 'BLACK' : 'WHITE'}
            {isCpuHand && <span className="cpu-badge">CPU</span>}
          </span>
          <span className="skill-panel-count">手札 {hand.length}/2</span>
        </div>
        <div className="skill-panel-body">
          {hand.length === 0 ? (
            <div className="skill-empty">EMPTY</div>
          ) : (
            hand.map((skill, index) => {
              const disabled = !isActive || !canUseSkill(skill) || isCpuHand;
              const selected = isActive && pendingSkill === skill && !isCpuHand;

              return (
                <button
                  key={`${skill}-${index}`}
                  className={`skill-button skill-${skill} ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''}`}
                  onClick={() => isActive && !isCpuHand && handleSkillClick(skill)}
                  type="button"
                >
                  <span className="skill-short">{SKILL_SHORT[skill]}</span>
                  <span className="skill-name">{SKILL_NAMES[skill]}</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const handleModeChange = (next: 'pvp' | 'cpu') => {
    setMode(next);
    setPendingSkill(null);
    setPendingTarget(null);
    resetGame();
  };

  const handleCpuPlayerChange = (next: Player) => {
    setCpuPlayer(next);
    setPendingSkill(null);
    setPendingTarget(null);
    resetGame();
  };

  const handleCpuLevelChange = (next: 'easy' | 'normal' | 'hard') => {
    setCpuLevel(next);
  };

  const getValidMovesForBoard = useCallback((boardState: Board, player: Player) => {
    const moves: { row: number; col: number }[] = [];
    const protection = getProtectionFor(player);
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (isValidMove(boardState, player, r, c, protection)) {
          moves.push({ row: r, col: c });
        }
      }
    }
    return moves;
  }, [getProtectionFor]);

  const getValidMovesFor = useCallback((player: Player) => {
    return getValidMovesForBoard(board, player);
  }, [board, getValidMovesForBoard]);

  const scoreMove = useCallback((player: Player, row: number, col: number) => {
    const protection = getProtectionFor(player);
    const flips = getFlippableDiscs(board, player, row, col, protection).length;
    let score = flips * 10;
    if (isCorner(row, col)) score += 80;
    else if (row === 0 || row === BOARD_SIZE - 1 || col === 0 || col === BOARD_SIZE - 1) score += 20;
    return score;
  }, [board, getProtectionFor]);

  const evaluateBoard = useCallback((boardState: Board, player: Player) => {
    const opponent: Player = player === 'black' ? 'white' : 'black';
    const { black, white } = getScore(boardState);
    const discScore = player === 'black' ? black - white : white - black;

    const corners: Array<[number, number]> = [
      [0, 0],
      [0, BOARD_SIZE - 1],
      [BOARD_SIZE - 1, 0],
      [BOARD_SIZE - 1, BOARD_SIZE - 1]
    ];
    let cornerScore = 0;
    for (const [r, c] of corners) {
      if (boardState[r][c] === player) cornerScore += 25;
      else if (boardState[r][c] === opponent) cornerScore -= 25;
    }

    let edgeScore = 0;
    for (let i = 1; i < BOARD_SIZE - 1; i++) {
      const top = boardState[0][i];
      const bottom = boardState[BOARD_SIZE - 1][i];
      const left = boardState[i][0];
      const right = boardState[i][BOARD_SIZE - 1];

      if (top === player) edgeScore += 2;
      else if (top === opponent) edgeScore -= 2;
      if (bottom === player) edgeScore += 2;
      else if (bottom === opponent) edgeScore -= 2;
      if (left === player) edgeScore += 2;
      else if (left === opponent) edgeScore -= 2;
      if (right === player) edgeScore += 2;
      else if (right === opponent) edgeScore -= 2;
    }

    const mobilityScore = (getValidMovesForBoard(boardState, player).length - getValidMovesForBoard(boardState, opponent).length) * 3;

    return discScore + cornerScore + edgeScore + mobilityScore;
  }, [getValidMovesForBoard]);

  const chooseMove = useCallback((player: Player) => {
    const moves = getValidMovesFor(player);
    if (moves.length === 0) return null;
    if (cpuLevel === 'easy') {
      return moves[Math.floor(Math.random() * moves.length)];
    }
    if (cpuLevel === 'normal') {
      let best = moves[0];
      let bestScore = scoreMove(player, best.row, best.col);
      for (const move of moves.slice(1)) {
        const score = scoreMove(player, move.row, move.col);
        if (score > bestScore) {
          bestScore = score;
          best = move;
        }
      }
      return best;
    }

    const protection = getProtectionFor(player);
    const opponent: Player = player === 'black' ? 'white' : 'black';
    let best = moves[0];
    let bestScore = -Infinity;

    for (const move of moves) {
      const nextBoard = applyMove(board, player, move.row, move.col, protection);
      let score = evaluateBoard(nextBoard, player);

      const opponentMoves = getValidMovesForBoard(nextBoard, opponent);
      if (opponentMoves.length > 0) {
        const opponentProtection = getProtectionFor(opponent);
        let worstReply = Infinity;
        for (const opponentMove of opponentMoves) {
          const replyBoard = applyMove(nextBoard, opponent, opponentMove.row, opponentMove.col, opponentProtection);
          const replyScore = evaluateBoard(replyBoard, player);
          if (replyScore < worstReply) {
            worstReply = replyScore;
          }
        }
        score = (score + worstReply) / 2;
      } else {
        score += 12;
      }

      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
    }

    return best;
  }, [board, cpuLevel, evaluateBoard, getProtectionFor, getValidMovesFor, getValidMovesForBoard, scoreMove]);

  const evaluateSkillTargets = useCallback((player: Player, skill: SkillType) => {
    let bestTarget: { row: number; col: number } | null = null;
    let bestScore = -Infinity;
    const opponent: Player = player === 'black' ? 'white' : 'black';
    const opponentProtection = getProtectionFor(opponent);

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = board[r][c];
        const isBlocked = block.black[r][c] || block.white[r][c];
        let score = -Infinity;
        switch (skill) {
          case 'convert':
            if (cell !== opponent || isCorner(r, c)) continue;
            score = 25;
            if (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1) score += 20;
            break;
          case 'remove':
            if (cell !== opponent || isCorner(r, c)) continue;
            score = 20;
            if (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1) score += 15;
            break;
          case 'shield':
            if (cell !== player || isCorner(r, c) || shield[r][c]) continue;
            score = 0;
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                if (dr === 0 && dc === 0) continue;
                const nr = r + dr;
                const nc = c + dc;
                if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE) continue;
                if (board[nr][nc] === opponent) score += 2;
              }
            }
            break;
          case 'block':
            if (cell !== null || isCorner(r, c) || isBlocked) continue;
            if (!isValidMove(board, opponent, r, c, opponentProtection)) continue;
            score = 25;
            if (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1) score += 10;
            break;
          case 'warp':
            if (cell !== null) continue;
            score = 8;
            if (isCorner(r, c)) score += 80;
            else if (r === 0 || r === BOARD_SIZE - 1 || c === 0 || c === BOARD_SIZE - 1) score += 20;
            if (skillTiles[`${r},${c}`] && hands[player].length < 2) score += 10;
            break;
          default:
            continue;
        }
        if (score > bestScore) {
          bestScore = score;
          bestTarget = { row: r, col: c };
        }
      }
    }

    if (!bestTarget || bestScore <= 0) return null;
    return { target: bestTarget, score: bestScore };
  }, [board, block, getProtectionFor, hands, shield, skillTiles]);

  const chooseSkillAction = useCallback((player: Player) => {
    if (turnSkillUsed || doubleMoveRemaining > 0) return null;
    const hand = hands[player];
    if (hand.length === 0) return null;

    const validMoves = getValidMovesFor(player);
    const moveScores = validMoves.map(move => scoreMove(player, move.row, move.col));
    const bestMoveScore = moveScores.length > 0 ? Math.max(...moveScores) : -Infinity;

    let bestSkill: SkillType | null = null;
    let bestTarget: { row: number; col: number } | undefined;
    let bestScore = -Infinity;

    const uniqueSkills = Array.from(new Set(hand));
    for (const skill of uniqueSkills) {
      if (skill === 'double') {
        if (validMoves.length < 2) continue;
        const sorted = [...moveScores].sort((a, b) => b - a);
        const score = (sorted[0] ?? 0) + (sorted[1] ?? 0) + 15;
        if (score > bestScore) {
          bestScore = score;
          bestSkill = skill;
          bestTarget = undefined;
        }
        continue;
      }
      const evaluated = evaluateSkillTargets(player, skill);
      if (!evaluated) continue;
      if (evaluated.score > bestScore) {
        bestScore = evaluated.score;
        bestSkill = skill;
        bestTarget = evaluated.target;
      }
    }

    if (!bestSkill) return null;

    if (cpuLevel === 'easy') {
      const chance = bestSkill === 'double' ? 0.4 : 0.3;
      if (Math.random() > chance && bestMoveScore > 0) return null;
    } else if (cpuLevel === 'normal') {
      if (bestScore < bestMoveScore + 5 && bestMoveScore > 0) return null;
    } else {
      if (bestScore < bestMoveScore - 5 && bestMoveScore > 0) return null;
    }

    return { skill: bestSkill, target: bestTarget };
  }, [
    cpuLevel,
    doubleMoveRemaining,
    evaluateSkillTargets,
    getValidMovesFor,
    hands,
    scoreMove,
    turnSkillUsed
  ]);

  useEffect(() => {
    if (mode !== 'cpu') return;
    if (gameOver) return;
    if (currentPlayer !== cpuPlayer) return;
    if (cpuBusyRef.current) return;

    cpuBusyRef.current = true;
    const delay = 500;
    cpuTimerRef.current = window.setTimeout(() => {
      cpuTimerRef.current = null;
      cpuBusyRef.current = false;

      const action = chooseSkillAction(cpuPlayer);
      if (action) {
        applySkill(action.skill, action.target);
        return;
      }

      const move = chooseMove(cpuPlayer);
      if (move) {
        makeMove(move.row, move.col);
        return;
      }

      passTurn();
    }, delay);

    return () => {
      if (cpuTimerRef.current) {
        window.clearTimeout(cpuTimerRef.current);
        cpuTimerRef.current = null;
      }
      cpuBusyRef.current = false;
    };
  }, [
    mode,
    cpuPlayer,
    cpuLevel,
    board,
    hands,
    shield,
    block,
    currentPlayer,
    gameOver,
    turnSkillUsed,
    doubleMoveRemaining,
    chooseMove,
    chooseSkillAction,
    applySkill,
    makeMove,
    passTurn
  ]);

  return (
    <div className="app-root" style={{ color: 'white', padding: '20px', background: '#0f0f13', minHeight: '100vh', textAlign: 'center', position: 'relative' }}>
      <button
        type="button"
        className="info-button"
        onClick={() => setIsInfoOpen(true)}
        aria-label="スキル説明を開く"
      >
        i
      </button>
      <div className="mode-panel">
        <label>
          <span>MODE</span>
          <select value={mode} onChange={(e) => handleModeChange(e.target.value as 'pvp' | 'cpu')}>
            <option value="pvp">PVP</option>
            <option value="cpu">CPU</option>
          </select>
        </label>
        {mode === 'cpu' && (
          <>
            <label>
              <span>CPU</span>
              <select value={cpuPlayer} onChange={(e) => handleCpuPlayerChange(e.target.value as Player)}>
                <option value="black">BLACK</option>
                <option value="white">WHITE</option>
              </select>
            </label>
            <label>
              <span>LEVEL</span>
              <select value={cpuLevel} onChange={(e) => handleCpuLevelChange(e.target.value as 'easy' | 'normal' | 'hard')}>
                <option value="easy">Easy</option>
                <option value="normal">Normal</option>
                <option value="hard">Hard</option>
              </select>
            </label>
          </>
        )}
      </div>
      <h1 className="app-title" style={{ textShadow: '0 0 10px #ff00de', fontSize: '2.5rem' }}>SkillVersi</h1>

      <div className="score-row" style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
        <div className="score-card" style={{ padding: '1rem', border: currentPlayer === 'black' ? '2px solid #00ffff' : '2px solid transparent', borderRadius: '8px' }}>
          <div className="score-label">BLACK</div>
          <div className="score-number" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{score.black}</div>
        </div>
        <div className="score-vs" style={{ alignSelf: 'center' }}>VS</div>
        <div className="score-card" style={{ padding: '1rem', border: currentPlayer === 'white' ? '2px solid #ff00de' : '2px solid transparent', borderRadius: '8px' }}>
          <div className="score-label">WHITE</div>
          <div className="score-number" style={{ fontSize: '2rem', fontWeight: 'bold' }}>{score.white}</div>
        </div>
      </div>

      <div className="status-line">
        <span className="turn-indicator">TURN: {currentPlayer === 'black' ? 'BLACK' : 'WHITE'}</span>
        {doubleMoveRemaining > 0 && (
          <span className="turn-indicator">2回置き 残り {doubleMoveRemaining}</span>
        )}
        {pendingSkill && (
          <span className="turn-indicator">スキル選択中: {SKILL_NAMES[pendingSkill]}</span>
        )}
      </div>

      <div className="board-layout">
        <div className="side-panel left-panel">
          {renderHand('black')}
        </div>
        <div className="board-stack">
          <div style={{
            display: 'inline-grid',
            gridTemplateColumns: 'repeat(8, var(--cell-size))',
            gap: 'var(--cell-gap)',
            background: '#008b8b',
            padding: 'var(--cell-gap)',
            borderRadius: '4px',
            boxShadow: '0 0 15px #008b8b',
            position: 'relative',
            zIndex: 1
          }}>
            {board.map((row, ri) =>
              row.map((cell, ci) => {
                const canPlace = !gameOver && !cell && isValidMove(board, currentPlayer, ri, ci, flipProtection);
                const indicatorColor = currentPlayer === 'black' ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 0, 222, 0.4)';
                const skillTile = skillTiles[`${ri},${ci}`];
                const isBlockedCell = !cell && block[currentPlayer][ri][ci];
                const isTargetable = pendingSkill && SKILL_REQUIRES_TARGET[pendingSkill]
                  ? isValidSkillTarget(pendingSkill, ri, ci)
                  : false;
                const isTargeted = pendingTarget && pendingTarget.row === ri && pendingTarget.col === ci;
                const cursor = isTargetable || canPlace ? 'pointer' : 'default';

                return (
                  <div
                    key={`${ri}-${ci}`}
                    className={`board-cell ${isBlockedCell ? 'blocked-cell' : ''} ${isTargetable ? 'targetable-cell' : ''} ${isTargeted ? 'target-cell' : ''}`}
                    onClick={() => handleCellClick(ri, ci)}
                    data-row={ri}
                    data-col={ci}
                    style={{
                      width: 'var(--cell-size)',
                      height: 'var(--cell-size)',
                      background: canPlace ? '#252525' : '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor,
                      transition: 'background 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    {!cell && skillTile && (
                      <div className={`skill-tile skill-${skillTile}`}>
                        <span className="skill-short">{SKILL_SHORT[skillTile]}</span>
                      </div>
                    )}
                    {cell ? (
                      <div
                        className={`disc ${cell} ${shield[ri][ci] ? 'shielded' : ''}`}
                        style={{
                          width: 'var(--disc-size)',
                          height: 'var(--disc-size)',
                          borderRadius: '50%',
                          background: cell === 'black' ? 'linear-gradient(135deg, #333 0%, #1a1a1a 100%)' : 'linear-gradient(135deg, #fff 0%, #ccc 100%)',
                          border: cell === 'black' ? '2px solid #888' : '2px solid #fff',
                          boxShadow: cell === 'black' ? '0 0 15px rgba(0, 255, 255, 0.6), inset 0 0 10px rgba(255,255,255,0.1)' : '0 0 15px rgba(255, 0, 222, 0.6), inset 0 0 5px rgba(0,0,0,0.2)',
                          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          transform: 'scale(1)',
                          animation: 'popIn 0.3s ease-out'
                        }}
                      />
                    ) : canPlace ? (
                      <div style={{
                        width: 'var(--indicator-size)',
                        height: 'var(--indicator-size)',
                        borderRadius: '50%',
                        background: indicatorColor,
                        boxShadow: `0 0 10px ${indicatorColor}`,
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }} />
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
          {pendingSkill && SKILL_REQUIRES_TARGET[pendingSkill] && (
            <div className="skill-action-bar">
              <div className="skill-hint">
                対象を選択して確定してください
              </div>
              <div className="skill-actions">
                <button
                  className="skill-confirm"
                  type="button"
                  onClick={confirmSkill}
                  disabled={!pendingTarget}
                >
                  確定
                </button>
                <button
                  className="skill-cancel"
                  type="button"
                  onClick={cancelSkill}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="side-panel right-panel">
          {renderHand('white')}
        </div>
      </div>

      <VFXLayer lastMove={lastMove} />

      <div className="log-panel">
        <div className="log-header">LOG</div>
        <div className="log-body">
          {logs.length === 0 ? (
            <div className="log-empty">まだログはありません</div>
          ) : (
            [...logs].slice(-8).reverse().map((log, index) => (
              <div key={`log-${index}`} className="log-item">{log}</div>
            ))
          )}
        </div>
      </div>

      {isInfoOpen && (
        <div className="info-modal-overlay" role="dialog" aria-modal="true">
          <div className="info-modal">
            <div className="info-modal-header">
              <div className="info-title">スキル解説</div>
              <button
                type="button"
                className="info-close"
                onClick={() => setIsInfoOpen(false)}
                aria-label="閉じる"
              >
                ×
              </button>
            </div>
            <div className="info-body">
              <div className="info-note">1ターンにつきスキル使用は1回まで。</div>
              <div className="info-grid">
                {Object.entries(SKILL_NAMES).map(([key, name]) => {
                  const skill = key as SkillType;
                  return (
                    <div key={skill} className={`info-card skill-${skill}`}>
                      <div className="info-skill-head">
                        <span className="skill-short">{SKILL_SHORT[skill]}</span>
                        <span className="info-skill-name">{name}</span>
                      </div>
                      <div className="info-skill-desc">{SKILL_DESCRIPTIONS[skill]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {gameOver && (
        <div className="result-panel">
          <div className="result-title">RESULT</div>
          <div className="result-winner">
            {winner === 'draw' ? 'DRAW' : `${winner?.toUpperCase()} WINS!`}
          </div>
          <div className="result-score">
            <div>
              <span className="result-label">BLACK</span>
              <span className="result-value">{score.black}</span>
            </div>
            <div>
              <span className="result-label">WHITE</span>
              <span className="result-value">{score.white}</span>
            </div>
          </div>
          <button className="restart-btn" onClick={resetGame} type="button">
            PLAY AGAIN
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0.8; }
        }
        @keyframes popIn {
          0% { transform: scale(0); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

export default App;
