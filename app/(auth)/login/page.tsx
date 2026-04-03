import { AuthShell } from "../_components/auth-shell";
import { LoginForm } from "../_components/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Login"
      description="Access your workspace, review inventory health, and keep daily operations moving."
    >
      <LoginForm />
    </AuthShell>
  );
}
