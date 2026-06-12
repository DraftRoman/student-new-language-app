export type TurtleState = "idle" | "covering" | "happy" | "wondered";
interface Props {
    state: TurtleState;
}
export default function TurtlePeek({ state }: Props): import("react/jsx-runtime").JSX.Element;
export {};
