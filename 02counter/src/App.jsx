import { useState } from "react";
import "./App.css";

function App() {

  // -------------------------------
  // ❌ Plain JS variable (React does NOT track this)
  // let count = 0;
  // -------------------------------

  // ✅ React state (React tracks this & re-renders UI)
  const [count, setCount] = useState(0);

  const addValue = () => {

    // ❌ This works in JS memory, but React UI will NOT update
    // count++;

    // ❌ Plain JS DOM manipulation (NOT recommended in React)
    // document.getElementById("count").innerText =
    //   "Count Value: " + count;
    // const dd = document.getElementById("count");
    // dd.style.color = "red";
    // dd.innerText = "Count Value: " + count;

    // ---------------------------------
    // ✅ Correct React way
    // React re-renders when state changes
    // ---------------------------------
    if (count < 20) {                 // constraint: max 20
      setCount(count + 1);
    }
    // setCount(count=>count+1);
  };

  const removeValue = () => {
    if (count > 0) {                  // constraint: min 0
      setCount(count - 1);
    }
  };

  // ---------------------------------
  // Dynamic styling using state
  // ---------------------------------
  let color = "black";
  if (count > 0) color = "green";
  if (count === 20) color = "red";
  if(count===0) color ="orange";

  return (
    <>
      <h1>Counter</h1>

      {/* 
        ❌ Plain JS approach (NOT reactive)
        <h2 id="count">Count Value : {count}</h2>
      */}

      {/* 
        ✅ React approach
        UI updates automatically when count changes
      */}
      <h2 style={{ color }}>
        Count Value : {count}
      </h2>

      <br />

      <button onClick={addValue}>
        Increment: {count}
      </button>

      <br />
      <br />

      <button onClick={removeValue}>
        Decrement: {count}
      </button>
    </>
  );
}

export default App;
