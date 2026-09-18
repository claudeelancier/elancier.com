import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'
import { ToastViewport } from '../common/Toast'
import { Suspense } from 'react'
import { LoadingState } from '../common/States'

export function AppShell() {
  return (
    <div className="ambient-grid min-h-screen">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <Suspense
          fallback={
            <div className="grid min-h-[40vh] place-items-center">
              <LoadingState label="Loading page" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ToastViewport />
    </div>
  )
}
