'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
            <span className="text-2xl text-red-400">!</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
            <p className="text-sm text-gray-400">
              An unexpected error occurred. Please try again.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="w-full h-11 rounded-md bg-gradient-to-r from-indigo-500 to-blue-600 text-white text-sm font-medium hover:from-indigo-600 hover:to-blue-700"
            >
              Try Again
            </button>
            <a
              href="/"
              className="w-full h-11 rounded-md border border-gray-700 text-gray-300 text-sm font-medium hover:text-white flex items-center justify-center"
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
