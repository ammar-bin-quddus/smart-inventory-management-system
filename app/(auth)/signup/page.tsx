import { AuthShell } from "../_components/auth-shell";
import { SignupForm } from "../_components/signup-form";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create an account"
      description="Set up your first inventory user account and jump straight into stock management."
    >
      <SignupForm />
    </AuthShell>
  );
}
