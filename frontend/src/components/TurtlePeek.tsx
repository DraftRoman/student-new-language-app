export type TurtleState = "idle" | "covering" | "happy" | "wondered";

interface Props { state: TurtleState; }

const IMG: Record<TurtleState, string> = {
  idle:     "/turtle.png",
  covering: "/turtle2.png",
  happy:    "/turtle.png",
  wondered: "/wondered-turtle.png",
};

export default function TurtlePeek({ state }: Props) {
  return (
    <div className="relative w-[110px] h-[110px]">
      <img
        src={IMG[state]}
        alt="turtle"
        className={`turtle-img ${state}`}
      />

      {state === "happy" && (
        <>
          <div
            className="absolute top-[-8px] left-[-4px] text-[1.1rem] pointer-events-none"
            style={{ animation: "turtle-happy 0.7s ease-in-out 0.55s 3", animationDelay: "0.1s" }}
          >✨</div>
          <div
            className="absolute top-[-8px] right-[-4px] text-[1.1rem] pointer-events-none"
            style={{ animation: "turtle-happy 0.7s ease-in-out 3", animationDelay: "0.3s" }}
          >⭐</div>
        </>
      )}

      {state === "wondered" && (
        <div
          className="absolute top-[-10px] right-[-8px] text-[1.2rem] pointer-events-none"
          style={{ animation: "turtle-wondered 0.5s ease-out 0.1s both" }}
        >❓</div>
      )}
    </div>
  );
}
