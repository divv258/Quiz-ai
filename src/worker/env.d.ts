// Extend the Env interface with custom secrets
declare global {
  interface Env {
    GROQ_API_KEY: string;
  }
}

export {};
