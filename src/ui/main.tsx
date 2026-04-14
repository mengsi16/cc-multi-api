import { render } from "react-dom";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { UI_BASENAME } from "./router";

render(
  <BrowserRouter basename={UI_BASENAME}>
    <App />
  </BrowserRouter>,
  document.getElementById("root")!
);
