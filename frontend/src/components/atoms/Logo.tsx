interface LogoProps {
  size?: "sm" | "md";
}

const sizes = {
  sm: { img: "w-10 h-10", text: "text-lg" },
  md: { img: "w-12 h-12", text: "text-xl" },
};

export default function Logo({ size = "md" }: LogoProps) {
  return (
    <div className="flex items-center gap-2">
      <img src="/turtle.png" alt="TurtleTalk logo" className={sizes[size].img} />
      <span className={`${sizes[size].text} font-extrabold tracking-tight text-current`}>
        TurtleTalk
      </span>
    </div>
  );
}
