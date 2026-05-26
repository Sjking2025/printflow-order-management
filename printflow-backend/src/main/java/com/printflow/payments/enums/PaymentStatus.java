package com.printflow.payments.enums;

/**
 * Full payment lifecycle status for both Manual UPI and Razorpay gateway flows.
 *
 * Manual UPI path:
 *   PENDING → PROOF_UPLOADED → VERIFIED (owner approves)
 *   PENDING → PROOF_UPLOADED → REJECTED (owner rejects)
 *
 * Razorpay gateway path:
 *   PENDING → GATEWAY_INITIATED → PAID (signature verified + webhook confirmed)
 *   PENDING → GATEWAY_INITIATED → FAILED (payment declined or signature mismatch)
 *   PAID    → REFUNDED (future)
 */
public enum PaymentStatus {
    PENDING,              // Initial state — no payment action yet
    PROOF_UPLOADED,       // Manual UPI: screenshot uploaded, awaiting owner review
    VERIFIED,             // Manual UPI: owner approved
    REJECTED,             // Manual UPI: owner rejected
    GATEWAY_INITIATED,    // Razorpay: gateway order created, checkout opened
    PAID,                 // Razorpay: payment captured and signature verified
    FAILED,               // Razorpay: payment failed or signature mismatch
    REFUNDED              // Future: refund processed
}
