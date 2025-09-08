import { useState, useEffect } from "react";
import { useWalletSelector } from '@near-wallet-selector/react-hook';
import { ContractId } from "@/config";
import Navigation from "@/components/Navigation";
import Disclaimer from "@/components/Disclaimer";
import DaoManifesto from "@/components/DaoManifesto";
import ProposalForm from "@/components/ProposalForm";
import ProposalList from "@/components/ProposalList";
import styles from "@/styles/app.module.css";

export default function Home() {
  const { signedAccountId, viewFunction, callFunction } = useWalletSelector();
  const [manifesto, setManifesto] = useState("");
  const [finalizedProposals, setFinalizedProposals] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  // Load manifesto and finalized proposals
  const loadDaoData = async () => {
    try {      
      // Load manifesto
      const manifestoText = await viewFunction({
        contractId: ContractId,
        method: "get_manifesto",
      });
      setManifesto(manifestoText);

      // Load finalized proposals
      const finalized = await viewFunction({
        contractId: ContractId,
        method: "get_finalized_proposals",
        args: { from_index: null, limit: null },
      });
      setFinalizedProposals(finalized);

      // Clear any previous error messages
      setErrorMessage("");

    } catch (error) {
      setErrorMessage("Contract connection error: Please set the contract ID in the config.js file then refresh the page.");
    }
  };

  // Refresh data after proposal creation
  const handleProposalCreated = () => {
    loadDaoData();
  };

  // Load data on page load
  useEffect(() => {
    loadDaoData();
  }, []);

  return (
    <main className={styles.main}>
      <div className="container mt-2">
        <Disclaimer />
        <Navigation />
        <h1>🏛️ AI DAO</h1>
        
        {errorMessage && (
          <div className="alert alert-danger" role="warning">
            <p className="mb-0">{errorMessage}</p>
          </div>
        )}
        
        <div className="alert alert-info" role="alert">
          <p className="mb-0"> 
            Welcome to the AI DAO powered by Shade Agents 
            <br />
            Create a proposal and the verifiable AI agent will vote on it based on the DAO's manifesto
          </p>
        </div>
        
        <DaoManifesto manifesto={manifesto} />
        <ProposalForm 
          onSubmit={handleProposalCreated}
          contractId={ContractId}
          callFunction={callFunction}
          isSignedIn={!!signedAccountId}
          manifestoMissing={!manifesto}
          setErrorMessage={setErrorMessage}
        />
        <ProposalList 
          finalizedProposals={finalizedProposals}
        />
      </div>
    </main>
  );
}
