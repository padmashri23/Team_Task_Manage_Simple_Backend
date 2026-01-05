import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App.jsx'
import { store } from './store/store.js'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <HashRouter>
        <Toaster position="top-right" richColors />
        <App />
      </HashRouter>
    </Provider>
  </React.StrictMode>,
)
