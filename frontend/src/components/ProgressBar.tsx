import React from "react";

interface ProgressBarProps {
  currentPlayers: number;
  maxPlayers: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  currentPlayers,
  maxPlayers,
}) => {
  const progressPercentage = (currentPlayers / maxPlayers) * 100;

  return (
    <div className="relative h-6 bg-slate-400">
      <div
        className="absolute h-full bg-green-500 transition-all duration-300"
        style={{ width: `${progressPercentage}%` }}
      />
      <span className="absolute left-0 text-xs text-gray-600 px-3 py-1 text-white">
        {currentPlayers} of {maxPlayers} players
      </span>
    </div>
  );
};

export default ProgressBar;
