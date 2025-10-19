import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './Route'
import { BrowserRouter } from "react-router-dom"
import ReactDOM from "react-dom/client";
import App_main from './App'
ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <App />

    </BrowserRouter>
  </StrictMode>,
)
