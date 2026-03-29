import { useState } from "react"
import { auth } from "../firebase"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth"

function AuthPage({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (!email || !password) return "All fields are required"
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) return "Enter a valid email"
    if (password.length < 6) return "Password must be at least 6 characters"
    return ""
  }

  const handleSubmit = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError("")
    setLoading(true)

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      onLogin()
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("Email already in use")
      else if (err.code === "auth/invalid-email") setError("Invalid email address")
      else if (err.code === "auth/weak-password") setError("Password must be at least 6 characters")
      else if (err.code === "auth/invalid-credential") setError("Wrong email or password")
      else setError("Something went wrong, try again")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="bg-gray-800 p-8 rounded-2xl w-full max-w-sm shadow-xl">

        <h1 className="text-3xl font-bold text-center mb-2 text-white">
          DramaTunes 🎵
        </h1>

        <p className="text-gray-400 text-center mb-6">
          {isSignup ? "Create your account" : "Welcome back"}
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 text-sm p-2 rounded-lg mb-4 text-center">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded-lg bg-gray-700 text-white mb-3 outline-none focus:ring-2 focus:ring-purple-500"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded-lg bg-gray-700 text-white mb-6 outline-none focus:ring-2 focus:ring-purple-500"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
        />

        <button
          className={`w-full py-3 rounded-lg font-semibold transition-all ${
            loading ? "bg-gray-600 cursor-not-allowed" : "bg-purple-600 hover:bg-purple-700"
          }`}
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Please wait..." : isSignup ? "Sign Up" : "Log In"}
        </button>

        <p className="text-center text-gray-400 mt-6 text-sm">
          {isSignup ? "Already have an account?" : "Don't have an account?"}
          <button
            className="text-purple-400 ml-1 hover:underline"
            onClick={() => { setIsSignup(!isSignup); setError("") }}
          >
            {isSignup ? "Log In" : "Sign Up"}
          </button>
        </p>

      </div>
    </div>
  )
}

export default AuthPage