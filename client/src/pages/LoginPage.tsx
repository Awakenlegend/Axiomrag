import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Logo } from "../components/AppShell";
import { startLogin } from "../const";

export default function LoginPage() {
  return <div className="login-page login-reference"><video className="shell-art" autoPlay muted loop playsInline preload="metadata" aria-hidden="true" poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/130837c4-0244-4f37-9c61-8d801d93fd29.jpg" src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260912_104303_0c6d60b2-9353-408e-9449-585108a22fb5.mp4" /><div className="shell-veil" /><div className="card login-card"><Link href="/"><Logo /></Link><h1>Welcome back.</h1><p>Sign in to upload documents, ask grounded questions, and inspect every verification step.</p><button className="btn btn-primary" style={{ width: "100%", marginTop: 2 }} onClick={() => startLogin()}>Continue with Manus <ArrowRight size={15} /></button><div style={{ textAlign: "center", marginTop: 22 }}><span className="tiny muted">Your research workspace stays private and inspectable.</span></div></div></div>;
}

