import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import DaoManifesto from "@/components/DaoManifesto";
import ProposalForm from "@/components/ProposalForm";
import ProposalList from "@/components/ProposalList";
import styles from "@/styles/app.module.css";
import { useWalletSelector } from '@near-wallet-selector/react-hook';
import { DaoContract } from "@/config";

export default function Home() {
  const { signedAccountId, viewFunction, callFunction } = useWalletSelector();
  const [manifesto, setManifesto] = useState("");
  const [finalizedProposals, setFinalizedProposals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (signedAccountId) {
      loadDaoData();
    }
  }, [signedAccountId]);

  const loadDaoData = async () => {
    try {
      setLoading(true);
      
      // Load manifesto
      const manifestoText = await viewFunction({
        contractId: DaoContract,
        method: "get_manifesto",
      });
      setManifesto(manifestoText);

      // Load finalized proposals
      const finalized = await viewFunction({
        contractId: DaoContract,
        method: "get_finalized_proposals",
        args: { from_index: null, limit: null },
      });
      setFinalizedProposals(finalized);
    } catch (error) {
      console.error("Error loading DAO data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProposalCreated = () => {
    // Refresh data after proposal creation
    loadDaoData();
  };

  // Load data regardless of login status, but only if we have a contract connection
  useEffect(() => {
    loadDaoData();
  }, []);

  // Show sign-in prompt if not logged in
  const showSignInPrompt = !signedAccountId;

  return (
    <main className={styles.main}>
      <Navigation />
      <div className="container mt-4">
        <h1>🏛️ NEAR DAO</h1>
        
        {showSignInPrompt && (
          <div className="alert alert-info" role="alert">
            <strong>👋 Welcome!</strong> You can view the DAO manifesto and previous proposals without signing in. 
            <strong> Sign in to create new proposals.</strong>
          </div>
        )}
        
        {loading ? (
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : (
          <>
            <DaoManifesto manifesto={manifesto} />
            <ProposalForm 
              onSubmit={handleProposalCreated}
              contractId={DaoContract}
              callFunction={callFunction}
              disabled={showSignInPrompt}
            />
            <ProposalList 
              finalizedProposals={finalizedProposals}
            />
          </>
        )}
      </div>
    </main>
  );
}
