import './App.css'
import Card from './components/Card'

function App() {
  let cc="hiii";

  return (
      <>
        <h1 className='text-3xl mb-4'>
          Hellow world
        </h1>
        <Card username={"ankit singh"} btnText={cc}/>
      </>
  )
}

export default App
