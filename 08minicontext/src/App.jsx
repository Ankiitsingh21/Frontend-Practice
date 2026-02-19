
import Login from './components/Login'
import Profile from './components/profile'
import UserContextProvider from './context/UserContextProvider'

function App() {

  return (
    <UserContextProvider>
      <h1>Hellow world </h1>
      <Login/>
      <Profile/>
    </UserContextProvider>
  )
}

export default App
