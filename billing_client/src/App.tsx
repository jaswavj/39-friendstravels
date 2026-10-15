import { Fragment } from 'react'
import './style/main_style.css'
import AppRouter from './routes/AppRouter'
import { ToastContainer } from 'react-toastify'

export default function App() {
  return (
    <Fragment>
      <ToastContainer />
      <div style={{ height: '100vh', overflow: 'hidden' }}>
        <AppRouter />
      </div>
    </Fragment>
  )
}
