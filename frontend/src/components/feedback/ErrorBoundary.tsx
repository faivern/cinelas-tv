import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import StatusPage, { getStatusConfig } from "./StatusPage";
import {
  isServerDown,
  reportNetworkFailure,
  subscribeServerStatus,
} from "../../lib/connection/serverStatus";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const config = getStatusConfig(500)!;

class ErrorBoundary extends Component<Props, State> {
  private unsubscribe?: () => void;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    // Chunk imports bypass axios, so an outage-caused failure would otherwise
    // never surface the reconnect overlay. The probe confirms before showing,
    // so this is a no-op for genuine render bugs.
    reportNetworkFailure();
  }

  componentDidMount() {
    // A server outage can fail a lazy route chunk import, which lands here.
    // React.lazy caches the rejection, so once the server is back the only
    // clean recovery is a reload of the current route.
    this.unsubscribe = subscribeServerStatus(() => {
      if (this.state.hasError && !isServerDown()) window.location.reload();
    });
  }

  componentWillUnmount() {
    this.unsubscribe?.();
  }

  render() {
    if (this.state.hasError) {
      return <StatusPage {...config} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
