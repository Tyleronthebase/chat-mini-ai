import { Component } from "react";

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("[ErrorBoundary]", error, info?.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100vh",
                    gap: "16px",
                    fontFamily: "inherit",
                    color: "#3c4043"
                }}>
                    <div style={{ fontSize: "48px" }}>😵</div>
                    <h2 style={{ margin: 0, fontSize: "24px", fontWeight: 500 }}>出了点问题</h2>
                    <p style={{ margin: 0, color: "#5f6368", fontSize: "14px", maxWidth: "400px", textAlign: "center" }}>
                        {this.state.error?.message || "应用遇到了未知错误"}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: "8px",
                            padding: "10px 24px",
                            borderRadius: "999px",
                            border: "none",
                            background: "#0b57d0",
                            color: "#fff",
                            fontSize: "14px",
                            fontWeight: 500,
                            cursor: "pointer"
                        }}
                    >
                        刷新页面
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
