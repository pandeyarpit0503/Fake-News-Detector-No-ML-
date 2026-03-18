import { useEffect, useState } from "react";

export default function ScoreMeter({ score, verdict }) {
    const [animatedScore, setAnimatedScore] = useState(0);

    useEffect(() => {
        // Animate score from 0
        setAnimatedScore(0);
        const timeout = setTimeout(() => {
            setAnimatedScore(score);
        }, 100);
        return () => clearTimeout(timeout);
    }, [score]);

    const radius = 60;
    const strokeWidth = 8;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

    let colorClass = "text-[var(--success)]";
    if (score < 40) colorClass = "text-[var(--danger)]";
    else if (score < 70) colorClass = "text-[var(--warning)]";
    if (verdict?.label === "UNVERIFIED") colorClass = "text-[var(--gray)]";

    return (
        <div className="relative flex items-center justify-center w-[120px] h-[120px]">
            {/* Background ring */}
            <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                <circle
                    stroke="var(--beige-200)"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
                {/* Progress ring */}
                <circle
                    className={`transition-all duration-[1200ms] ease-out ${colorClass}`}
                    stroke="currentColor"
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference + " " + circumference}
                    style={{ strokeDashoffset }}
                    r={normalizedRadius}
                    cx={radius}
                    cy={radius}
                />
            </svg>

            {/* Center text */}
            <div className="absolute flex flex-col items-center justify-center top-0 left-0 w-full h-full">
                <span className={`text-3xl font-bold font-lato ${colorClass}`}>
                    {Math.round(animatedScore)}
                </span>
                <span className="text-xs text-[var(--brown-light)] mt-[-2px]">/ 100</span>
            </div>
        </div>
    );
}
