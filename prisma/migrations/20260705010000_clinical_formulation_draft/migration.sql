-- Sprint 7: clinician-owned clinical formulation per domain.
ALTER TABLE "DomainReview" ADD COLUMN "clinicalFormulationDraft" JSONB;
