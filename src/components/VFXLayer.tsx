import React, { useEffect, useRef } from 'react';
import type { Player } from '../utils/gameLogic';

interface VFXLayerProps {
    lastMove: {
        player: Player;
        row: number;
        col: number;
        flipped: { row: number; col: number }[];
    } | null;
}

class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
    decay: number;

    constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2; // Faster particles
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.color = color;
        this.size = Math.random() * 6 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.92; // stronger friction
        this.vy *= 0.92;
        this.life -= this.decay;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();

        // Add glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fill();

        ctx.restore();
    }
}

class Shockwave {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    life: number;
    color: string;
    lineWidth: number;

    constructor(x: number, y: number, color: string) {
        this.x = x;
        this.y = y;
        this.radius = 1;
        this.maxRadius = 150;
        this.life = 1.0;
        this.color = color;
        this.lineWidth = 8;
    }

    update() {
        this.radius += (this.maxRadius - this.radius) * 0.15;
        this.life -= 0.03;
        this.lineWidth *= 0.95;
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.lineWidth;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Glow
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.stroke();

        ctx.restore();
    }
}

export const VFXLayer: React.FC<VFXLayerProps> = ({ lastMove }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particles = useRef<(Particle | Shockwave)[]>([]);

    useEffect(() => {
        if (!lastMove) return;

        // Need to find board element to get coordinates
        // Using a simple grid calculation assuming layout matches App.tsx
        // Ideally we should pass refs, but for now we'll select from DOM or calculate based on screen
        // Let's try to query the cell elements.

        const cells = document.querySelectorAll('.board-cell'); // We need to add this class to App.tsx
        if (cells.length !== 64) {
            // If we can't find cells, we can't place effects accurately.
            // Fallback or retry? 
            // Let's assume App.tsx will be updated to include 'board-cell' class and data-row/col attributes.
            return;
        }

        const getCenter = (r: number, c: number) => {
            const index = r * 8 + c;
            const cell = cells[index] as HTMLElement;
            const rect = cell.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        };

        const color = lastMove.player === 'black' ? '#00ffff' : '#ff00de'; // Neon Cyan vs Neon Pink

        // Impact effect at placement
        const center = getCenter(lastMove.row, lastMove.col);
        particles.current.push(new Shockwave(center.x, center.y, color));
        for (let i = 0; i < 30; i++) {
            particles.current.push(new Particle(center.x, center.y, color));
        }

        // Flip effects (chain reaction)
        lastMove.flipped.forEach((flip, index) => {
            setTimeout(() => {
                const flipCenter = getCenter(flip.row, flip.col);
                // Create a smaller burst for flipped pieces
                particles.current.push(new Shockwave(flipCenter.x, flipCenter.y, '#ffffff'));
                for (let i = 0; i < 15; i++) {
                    particles.current.push(new Particle(flipCenter.x, flipCenter.y, '#ffffff'));
                }
            }, index * 80 + 100); // Delay for chain effect
        });

    }, [lastMove]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        let animationId: number;
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Semi-transparent clear for trails? maybe too heavy.

            // Filter out dead particles
            particles.current = particles.current.filter(p => p.life > 0.01);

            particles.current.forEach(p => {
                p.update();
                p.draw(ctx);
            });

            if (particles.current.length > 0) {
                animationId = requestAnimationFrame(animate);
            } else {
                // If no particles, we can stop loop to save battery, 
                // but we need to restart it when new particles appear.
                // For simplicity, keep it running or restart in the other useEffect?
                // Actually, dependencies on 'lastMove' might trigger new particles.
                // Let's just keep requesting frame if particles exist, and checking occasionally?
                // Or simpliest: ALways run loop.
                animationId = requestAnimationFrame(animate);
            }
        };
        animate();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 9999
            }}
        />
    );
};
