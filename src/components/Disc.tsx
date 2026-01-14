import type { Player } from '../utils/gameLogic';
import './Disc.css';

interface DiscProps {
    color: Player;
}

export const Disc = ({ color }: DiscProps) => {
    return (
        <div className="disc-container">
            <div className={`disc ${color}`}>
                <div className="disc-face front"></div>
                <div className="disc-face back"></div>
            </div>
        </div>
    );
};
