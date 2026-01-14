import { useState } from 'react';
import { useOthello } from './hooks/useOthello';
import { VFXLayer } from './components/VFXLayer';
import { isValidMove, hasValidMoves, isCorner } from './utils/gameLogic';
import type { SkillType } from './utils/gameLogic';
import './index.css';

const SKILL_NAMES: Record<SkillType, string> = {
  convert: '変色',
  warp: 'ワープ',
  double: '2回置き',
  shield: 'シールド',
  barrier: 'バリア',
  remove: '除去'
};

const SKILL_SHORT: Record<SkillType, string> = {
  convert: 'CV',
  warp: 'WP',
  double: '2X',
  shield: 'SH',
  barrier: 'BR',
  remove: 'RM'
};

const SKILL_REQUIRES_TARGET: Record<SkillType, boolean> = {
  convert: true,
  warp: true,
  double: false,
  shield: true,
  barrier: true,
  remove: true
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
    resetGame,
    lastMove,
    skillTiles,
    hands,
    shield,
    barrier,
    logs,
    turnIndex,
    turnSkillUsed,
    doubleMoveRemaining
  } = useOthello();

  const [pendingSkill, setPendingSkill] = useState<SkillType | null>(null);
  const [pendingTarget, setPendingTarget] = useState<{ row: number; col: number } | null>(null);

  const barrierActive = Boolean(
    barrier && barrier.active && barrier.appliesTo === currentPlayer && barrier.expiresOnTurn === turnIndex
  );

  const flipProtection = {
    shield,
    barrier: barrierActive && barrier
      ? { active: true, appliesTo: currentPlayer, cells: barrier.cells }
      : null
  };

  const isValidSkillTarget = (skill: SkillType, row: number, col: number) => {
    const cell = board[row][col];
    switch (skill) {
      case 'convert':
        return cell !== null && cell !== currentPlayer && !isCorner(row, col);
      case 'warp':
        return cell === null;
      case 'double':
        return false;
      case 'shield':
        return cell === currentPlayer && !shield[row][col];
      case 'barrier':
        return cell === null;
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

  const handleSkillClick = (skill: SkillType) => {
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
    if (!pendingSkill || !pendingTarget) return;
    applySkill(pendingSkill, pendingTarget);
    setPendingSkill(null);
    setPendingTarget(null);
  };

  const cancelSkill = () => {
    setPendingSkill(null);
    setPendingTarget(null);
  };

  const renderHand = (player: 'black' | 'white') => {
    const isActive = player === currentPlayer;
    const hand = hands[player];

    return (
      <div className={`skill-panel ${isActive ? 'active' : ''}`}>
        <div className="skill-panel-header">
          <span>{player === 'black' ? 'BLACK' : 'WHITE'}</span>
          <span className="skill-panel-count">手札 {hand.length}/2</span>
        </div>
        <div className="skill-panel-body">
          {hand.length === 0 ? (
            <div className="skill-empty">EMPTY</div>
          ) : (
            hand.map((skill, index) => {
              const disabled = !isActive || !canUseSkill(skill);
              const selected = isActive && pendingSkill === skill;

              return (
                <button
                  key={`${skill}-${index}`}
                  className={`skill-button skill-${skill} ${disabled ? 'disabled' : ''} ${selected ? 'selected' : ''}`}
                  onClick={() => isActive && handleSkillClick(skill)}
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

  return (
    <div style={{ color: 'white', padding: '20px', background: '#0f0f13', minHeight: '100vh', textAlign: 'center' }}>
      <h1 style={{ textShadow: '0 0 10px #ff00de', fontSize: '2.5rem' }}>Neon Othello</h1>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
        <div style={{ padding: '1rem', border: currentPlayer === 'black' ? '2px solid #00ffff' : '2px solid transparent', borderRadius: '8px' }}>
          <div>BLACK</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{score.black}</div>
        </div>
        <div style={{ alignSelf: 'center' }}>VS</div>
        <div style={{ padding: '1rem', border: currentPlayer === 'white' ? '2px solid #ff00de' : '2px solid transparent', borderRadius: '8px' }}>
          <div>WHITE</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{score.white}</div>
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

      <div style={{
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(8, 60px)',
        gap: '3px',
        background: '#008b8b',
        padding: '3px',
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
            const isBarrierCell = barrierActive && barrier?.cells[ri][ci];
            const isTargetable = pendingSkill && SKILL_REQUIRES_TARGET[pendingSkill]
              ? isValidSkillTarget(pendingSkill, ri, ci)
              : false;
            const isTargeted = pendingTarget && pendingTarget.row === ri && pendingTarget.col === ci;
            const cursor = isTargetable || canPlace ? 'pointer' : 'default';

            return (
              <div
                key={`${ri}-${ci}`}
                className={`board-cell ${isBarrierCell ? 'barrier-cell' : ''} ${isTargetable ? 'targetable-cell' : ''} ${isTargeted ? 'target-cell' : ''}`}
                onClick={() => handleCellClick(ri, ci)}
                data-row={ri}
                data-col={ci}
                style={{
                  width: '60px',
                  height: '60px',
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
                      width: '50px',
                      height: '50px',
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
                    width: '20px',
                    height: '20px',
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

      <VFXLayer lastMove={lastMove} />

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

      <div className="panel-row">
        {renderHand('black')}
        {renderHand('white')}
      </div>

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

      {gameOver && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{ background: '#111', padding: '2rem', borderRadius: '20px', border: '2px solid white', boxShadow: '0 0 30px rgba(255,255,255,0.2)' }}>
            <h2 style={{ fontSize: '3rem', margin: 0 }}>GAME OVER</h2>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', background: 'linear-gradient(45deg, #00ffff, #ff00de)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {winner === 'draw' ? 'DRAW' : `${winner?.toUpperCase()} WINS!`}
            </p>
            <button onClick={resetGame} style={{ padding: '1rem 3rem', fontSize: '1.2rem', fontWeight: 'bold', cursor: 'pointer', borderRadius: '50px', border: 'none' }}>PLAY AGAIN</button>
          </div>
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
