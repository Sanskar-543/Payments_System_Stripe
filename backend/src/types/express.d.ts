/**
 * Augment the Express `Request` interface with custom properties
 * set by our authentication and resume-verification middlewares.
 */
declare namespace Express {
  interface Request {
    user?: {
      id: string;
    };
    resumeDetails?: {
      currentresume: import("../models/resume.model").resumetype;
      profile_snapshot: {
        id: string;
        targetRole: string;
        experienceYears: number;
        skills: unknown;
        interests: unknown;
        preferences: unknown;
        additionalContext: unknown;
      };
      target_role: string;
      target_country: string;
      job_description: string;
    };
  }
}
