import { useState } from 'react'
import './App.css'

function App() {
  const [colour,setColourr]=useState("olive");
  // setColour('red');
  return (
   <div className='w-full h-screen duration-200' style={{backgroundColor:colour}} >
    <div className='fixed flex flex-wrap justify-center bottom-12 inset-x-0 px-2' >
      <div className='flex flex-wrap justify-center bg-white gap-3 shadow-lg rounded-3xl px-3  py-2' >
        {/* </HI> */}
        {/* hi */}
        <button className='outline-none px-4 bg-red-400 rounded-2xl py-1 text-white shadow-2xs' onClick={()=>{setColourr('Red')}} >RED</button>
         <button className='outline-none px-4 bg-blue-400 rounded-2xl py-1 text-white shadow-2xs' onClick={()=>{setColourr('Blue')}} >Blue</button>
          <button className='outline-none px-4 bg-green-400 rounded-2xl py-1 text-white shadow-2xs' onClick={()=>{setColourr('Green')}} >Green</button>
           <button className='outline-none px-4 bg-yellow-400 rounded-2xl py-1 text-white shadow-2xs'onClick={()=>{setColourr('Yellow')}}  >Yellow</button>
            <button className='outline-none px-4 bg-orange-400 rounded-2xl py-1 text-white shadow-2xs'onClick={()=>{setColourr('Orange')}}  >Orange</button>
      </div>
    </div>
   </div>
  )
}

export default App
