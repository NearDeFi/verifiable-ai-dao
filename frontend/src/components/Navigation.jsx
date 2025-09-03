import { useEffect, useState } from "react";
import { useWalletSelector } from '@near-wallet-selector/react-hook';

export default function Navigation() {
  const { signedAccountId, signIn, signOut } = useWalletSelector();
  const [action, setAction] = useState(() => {});
  const [label, setLabel] = useState("Loading...");

  useEffect(() => {
    if (signedAccountId) {
      setAction(() => signOut);
      setLabel(`Sign Out ${signedAccountId}`);
    } else {
      setAction(() => signIn);
      setLabel("Sign In");
    }
  }, [signedAccountId]);

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid">
        <div className="navbar-nav ms-auto pt-1">
          <button className="btn btn-secondary" onClick={action}>
            {" "}
            {label}{" "}
          </button>
        </div>
      </div>
    </nav>
  );
}
