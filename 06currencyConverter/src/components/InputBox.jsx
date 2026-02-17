import { useId } from "react"

function InputBox({
  label,
  amount,
  onAmountChange,
  onCurrencyChange,
  currencyOptions = [],
  selectCurrency = "usd",
  amountDisable = false,
}) {
  const amountInputId = useId()

  return (
    <div className="bg-white rounded-lg p-4 flex gap-4 shadow-sm">
      {/* Amount input */}
      <div className="w-1/2">
        <label htmlFor={amountInputId} className="block text-gray-500 mb-1">
          {label}
        </label>
        <input
          id={amountInputId}
          type="number"
          value={amount}
          disabled={amountDisable}
          className="w-full border rounded-md px-2 py-1 outline-none"
          onChange={(e) => onAmountChange?.(+e.target.value)}
        />
      </div>

      {/* Currency dropdown */}
      <div className="w-1/2">
        <label className="block text-gray-500 mb-1">Currency</label>

        {/* 👇 ADD THIS SELECT */}
        <select
          size={5}
          value={selectCurrency}
          onChange={(e) => onCurrencyChange?.(e.target.value)}
          className="w-full border rounded-md px-2 py-1 bg-white"
        >
          {currencyOptions.map((currency) => (
            <option key={currency} value={currency}>
              {currency.toUpperCase()}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default InputBox
