import { Component, type ErrorInfo, type ReactNode } from "react";

type State = { failed: boolean };

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AxiomRAG interface error", error, info.componentStack);
  }

  render() {
    if (this.state.failed) return <main role="alert" style={{ padding: 32, color: "#edf4ff", background: "#07111f", minHeight: "100vh" }}>The workspace encountered an error. Refresh the page to try again.</main>;
    return this.props.children;
  }
}
