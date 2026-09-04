function Header({ email, onLogout }) {
  return (
    <header className="ledger-header">
      <div className="brand">
        <span className="brand-mark">L</span>
        <span>THE LEDGER</span>
      </div>

      <div className="header-right">
        <span>{email}</span>

        <button onClick={onLogout}>
          Sign out
        </button>
      </div>
    </header>
  )
}

export default Header