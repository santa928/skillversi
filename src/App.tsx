import { useOthello } from './hooks/useOthello';
import { VFXLayer } from './components/VFXLayer';
import { isValidMove } from './utils/gameLogic';
import './index.css';

function App() {
  const { board, currentPlayer, score, gameOver, winner, makeMove, resetGame, lastMove } = useOthello();

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

      <div style={{
        display: 'inline-grid',
        gridTemplateColumns: 'repeat(8, 60px)',
        gap: '3px',
        background: '#008b8b', // Darker Teal
        padding: '3px',
        borderRadius: '4px',
        boxShadow: '0 0 15px #008b8b', // Reduced glow intensity
        position: 'relative',
        zIndex: 1
      }}>
        {board.map((row, ri) =>
          row.map((cell, ci) => {
            const canPlace = !gameOver && !cell && isValidMove(board, currentPlayer, ri, ci);
            const indicatorColor = currentPlayer === 'black' ? 'rgba(0, 255, 255, 0.4)' : 'rgba(255, 0, 222, 0.4)';

            return (
              <div
                key={`${ri}-${ci}`}
                className="board-cell"
                onClick={() => makeMove(ri, ci)}
                data-row={ri}
                data-col={ci}
                style={{
                  width: '60px',
                  height: '60px',
                  background: canPlace ? '#252525' : '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: canPlace ? 'pointer' : 'default',
                  transition: 'background 0.2s ease'
                }}
              >
                {cell ? (
                  <div style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    background: cell === 'black' ? 'linear-gradient(135deg, #333 0%, #1a1a1a 100%)' : 'linear-gradient(135deg, #fff 0%, #ccc 100%)',
                    border: cell === 'black' ? '2px solid #888' : '2px solid #fff',
                    boxShadow: cell === 'black' ? '0 0 15px rgba(0, 255, 255, 0.6), inset 0 0 10px rgba(255,255,255,0.1)' : '0 0 15px rgba(255, 0, 222, 0.6), inset 0 0 5px rgba(0,0,0,0.2)',
                    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    transform: 'scale(1)',
                    animation: 'popIn 0.3s ease-out'
                  }} />
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
