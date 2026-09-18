import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-16 border-t border-white/8 bg-[#080B1A]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-heading text-lg font-bold">LUCKYVERSE</p>
          <p className="mt-2 max-w-sm text-sm text-white/50">Spin. Win. Celebrate. A premium promotional rewards platform with verified draws and server-controlled prizes.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-white/80">Play</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/50">
            <Link to="/spin">Spin & Win</Link>
            <Link to="/lucky-draw">Lucky Draw</Link>
            <Link to="/winners">Hall of Winners</Link>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-white/80">Support</p>
          <div className="mt-3 flex flex-col gap-2 text-sm text-white/50">
            <a href="mailto:support@luckyverse.com">support@luckyverse.com</a>
            <Link to="/login">Player login</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-white/6 px-4 py-4 text-center text-xs text-white/35">
        Fair play rules apply. Prize inventory is server-validated. © {new Date().getFullYear()} Luckyverse.
      </div>
    </footer>
  )
}
