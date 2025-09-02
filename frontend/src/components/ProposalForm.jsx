import { useState } from "react";

export default function ProposalForm({ onSubmit, contractId, callFunction, disabled = false }) {
  const [proposalText, setProposalText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!proposalText.trim()) {
      alert("Please enter a proposal text");
      return;
    }

    try {
      setIsSubmitting(true);
      
      await callFunction({
        contractId: contractId,
        method: "create_proposal",
        args: { proposal_text: proposalText.trim() },
        gas: "300000000000000",
      });

      setProposalText("");
      onSubmit(); // Refresh the data
      alert("Proposal created successfully! Waiting for AI response...");
    } catch (error) {
      console.error("Error creating proposal:", error);
      alert("Failed to create proposal. Please try again.");
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
        {disabled ? (
          <div className="text-center py-4">
            <p className="text-muted mb-3">Please sign in to create proposals</p>
            <button className="btn btn-primary" disabled>
              Sign In Required
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="proposalText" className="form-label">
                Proposal Text
              </label>
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
                  Creating...
                </>
              ) : (
                "Submit Proposal"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
