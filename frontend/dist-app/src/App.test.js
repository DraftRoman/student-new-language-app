import { jsx as _jsx } from "react/jsx-runtime";
import { render } from "@testing-library/react";
import App from "./App";
test("app renders without crashing", () => {
    render(_jsx(App, {}));
});
