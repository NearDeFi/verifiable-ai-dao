import { useState } from "react";

export default function ProposalForm({ onSubmit, contractId, callFunction, isSignedIn = false, manifestoMissing = false, setErrorMessage }) {
  const [proposalText, setProposalText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposalResult, setProposalResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      setProposalResult(null);
      
      // Create the proposal
      const response = await callFunction({
        contractId: contractId,
        method: "create_proposal",
        args: { proposal_text: proposalText.trim() },
        gas: "300000000000000",
      });

      const reasoning = response.reasoning;
      const vote = response.vote;

      // Set the proposal result
      setProposalResult({
        vote: vote,
        reasoning: reasoning
      });

      setProposalText("");
      onSubmit();
    } catch (error) {
      console.error("Error creating proposal:", error);
      setErrorMessage("Failed to create proposal. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card mb-4">
      <div className="card-header">
        <h3>📝 Create New Proposal</h3>
      </div>
      <div className="card-body">
        {!isSignedIn || manifestoMissing ? (
          <div className="text-center py-4">
            {manifestoMissing && (
              <p className="text-muted mb-3">DAO manifesto has not been set yet</p>
            )}
            {!isSignedIn && (
              <p className="text-muted mb-3">Please sign in to create proposals</p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <textarea
                id="proposalText"
                className="form-control"
                rows="4"
                value={proposalText}
                onChange={(e) => setProposalText(e.target.value)}
                placeholder="Enter your proposal here..."
                maxLength="10000"
                required
              />
              <div className="form-text">
                {proposalText.length}/10,000 characters
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !proposalText.trim()}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Waiting for AI DAO response...
                </>
              ) : (
                "Submit Proposal"
              )}
            </button>
            
            {proposalResult && (
              <div className="mt-3">
                <div className={`alert ${proposalResult.vote === 'Approved' ? 'alert-success' : 'alert-danger'}`} role="alert">
                  <h6 className="alert-heading mb-2">
                    {proposalResult.vote === 'Approved' ? '✅ Proposal Approved' : '❌ Proposal Rejected'}
                  </h6>
                  <p className="mb-1"><strong>AI Reasoning:</strong></p>
                  <p className="mb-0">{proposalResult.reasoning}</p>
                </div>
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
